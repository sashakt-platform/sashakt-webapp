import { BACKEND_URL } from '$env/static/private';
import { dev } from '$app/environment';
import { getCandidate } from '$lib/helpers/getCandidate';
import { getTestQuestions, getTimeLeft, getStates, type TState } from '$lib/server/test';
import { validateForm } from '$lib/components/form/validation';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Check if the form has any location fields (state, district, block)
 */
function hasLocationFields(testData: {
	form?: { fields?: Array<{ field_type: string }> };
}): boolean {
	if (!testData?.form?.fields) return false;
	const locationFieldTypes = ['state', 'district', 'block'];
	return testData.form.fields.some((field) => locationFieldTypes.includes(field.field_type));
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const candidate = getCandidate(cookies);

	// Fetch states if form has location fields (districts/blocks are fetched on-demand via search)
	let locations: { states: TState[] } | null = null;
	if (hasLocationFields(locals.testData)) {
		try {
			const states = await getStates(locals.testData.id);
			locations = { states };
		} catch (error) {
			console.error('Error fetching states:', error);
		}
	}

	if (candidate && candidate.candidate_test_id && candidate.candidate_uuid) {
		try {
			const timerResponse = await getTimeLeft(
				candidate.candidate_test_id,
				candidate.candidate_uuid
			);
			let testQuestionsResponse = null;

			if (timerResponse.time_left == null || timerResponse.time_left > 0) {
				testQuestionsResponse = await getTestQuestions(
					candidate.candidate_test_id,
					candidate.candidate_uuid
				);
			}

			return {
				candidate,
				testData: locals.testData,
				timeLeft: timerResponse.time_left,
				testQuestions: testQuestionsResponse,
				locations
			};
		} catch (error) {
			console.error('Error fetching candidate data:', error);
			cookies.delete('sashakt-candidate', {
				path: '/test/' + locals.testData.link,
				secure: !dev
			});
			throw redirect(303, '/test/' + locals.testData.link);
		}
	}
	return {
		candidate: null,
		timeToBegin: locals.timeToBegin,
		testData: locals.testData,
		testQuestions: null,
		locations
	};
};

export const actions = {
	createCandidate: async ({ request, locals, fetch, cookies }) => {
		// check if a candidate session already exists, if yes return it
		const existingCandidate = getCandidate(cookies);
		if (
			existingCandidate &&
			existingCandidate.candidate_test_id &&
			existingCandidate.candidate_uuid
		) {
			return {
				success: true,
				candidateData: existingCandidate
			};
		}

		const formData = await request.formData();
		const deviceInfo = formData.get('deviceInfo') as string;
		const entity = formData.get('entity') as string;
		const formResponsesStr = formData.get('formResponses') as string;

		const requestBody: {
			test_id: number;
			device_info: unknown;
			candidate_profile?: {
				entity_id: string;
			};
			form_responses?: Record<string, unknown>;
		} = {
			test_id: locals.testData.id,
			device_info: deviceInfo
		};

		// Handle form_responses from dynamic form
		if (formResponsesStr) {
			try {
				const formResponses = JSON.parse(formResponsesStr);
				// Ensure parsed value is a plain object
				if (
					typeof formResponses === 'object' &&
					formResponses !== null &&
					!Array.isArray(formResponses) &&
					Object.keys(formResponses).length > 0
				) {
					// Run server-side validation if form fields are available
					const formFields = locals.testData.form?.fields;
					if (formFields && formFields.length > 0) {
						const errors = validateForm(formFields, formResponses);
						if (Object.keys(errors).length > 0) {
							return fail(400, { error: 'Please fix the form errors and try again.' });
						}
					}
					requestBody.form_responses = formResponses;
				}
			} catch {
				if (locals.testData.form?.fields?.length) {
					return fail(400, { error: 'Invalid form_responses JSON' });
				}
			}
		}

		// TODO: May be remove this later, legacy entity support
		if (entity) {
			requestBody.candidate_profile = {
				entity_id: entity
			};
		}

		try {
			const response = await fetch(`${BACKEND_URL}/candidate/start_test/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			if (!response.ok) {
				return fail(response.status, { error: 'Failed to start test' });
			}
			const candidateData = await response.json();
			cookies.set('sashakt-candidate', JSON.stringify(candidateData), {
				expires: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hour
				path: '/test/' + locals.testData.link,
				httpOnly: true,
				sameSite: 'lax',
				secure: !dev
			});
			return {
				success: true,
				candidateData: candidateData
			};
		} catch (error) {
			console.error('Error in createCandidate:', error);
			return fail(500, { error: 'Cannot start test. Please check your internet connection.' });
		}
	},

	submitTest: async ({ cookies, fetch, locals }) => {
		const candidate = getCandidate(cookies);
		if (!candidate) {
			return fail(400, { candidate, missing: true });
		}

		const candidateUrl = (purpose: string) => {
			return `${BACKEND_URL}/candidate/${purpose}/${candidate.candidate_test_id}/?candidate_uuid=${candidate.candidate_uuid}`;
		};

		try {
			const response = await fetch(candidateUrl('submit_test'), {
				method: 'POST',
				headers: { accept: 'application/json' }
			});

			// handle 400 errors from backend and display error message
			if (response.status === 400) {
				const errorData = await response.json();
				const errorMessage = errorData?.detail || errorData?.message || 'Failed to submit test';
				return fail(400, { error: errorMessage, submitTest: false });
			}

			if (response.status === 200) {
				const result = await fetch(candidateUrl('result'), {
					method: 'GET',
					headers: { accept: 'application/json' }
				});

				if (!result.ok) return fail(400, { result: false, submitTest: true });

				const resultData = await result.json();
				let feedback = null;
				let testQuestions = null;

				if (locals.testData.show_feedback_on_completion) {
					try {
						const [feedbackResponse, testQuestionsData] = await Promise.all([
							fetch(
								`${BACKEND_URL}/candidate/${candidate.candidate_test_id}/review-feedback?candidate_uuid=${candidate.candidate_uuid}`,
								{ method: 'GET', headers: { accept: 'application/json' } }
							),
							getTestQuestions(candidate.candidate_test_id, candidate.candidate_uuid)
						]);
						if (feedbackResponse.ok) {
							const feedbackData = await feedbackResponse.json();
							feedback = feedbackData.map(
								(item: {
									question_revision_id: number;
									submitted_answer: string | null;
									correct_answer: number[];
								}) => {
									let submitted: number[] | string = [];
									if (item.submitted_answer) {
										try {
											const parsed = JSON.parse(item.submitted_answer);
											submitted = Array.isArray(parsed) ? parsed : item.submitted_answer;
										} catch {
											submitted = item.submitted_answer;
										}
									}
									return {
										question_revision_id: item.question_revision_id,
										submitted_answer: submitted,
										correct_answer: item.correct_answer
									};
								}
							);
							testQuestions = testQuestionsData;
						}
					} catch (error) {
						console.error('Error fetching feedback:', error);
					}
				}

				cookies.delete('sashakt-candidate', {
					path: '/test/' + locals.testData.link,
					secure: !dev
				});

				return { result: resultData, feedback, testQuestions, submitTest: true };
			}

			return { submitTest: false };
		} catch (error) {
			console.error('Error in submitTest:', error);
			return fail(500, { error: 'Failed to submit test', submitTest: false });
		}
	},

	reattempt: async ({ cookies, locals }) => {
		cookies.delete('sashakt-candidate', {
			path: '/test/' + locals.testData.link,
			secure: !dev
		});

		redirect(301, `/test/${locals.testData.link}`);
	}
} satisfies Actions;
