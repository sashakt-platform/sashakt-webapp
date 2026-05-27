import { BACKEND_URL } from '$env/static/private';
import { dev } from '$app/environment';
import { getCandidate } from '$lib/helpers/getCandidate';
import { getTestQuestions, getTimeLeft, getStates, type TState } from '$lib/server/test';
import { validateForm } from '$lib/components/form/validation';
import type { TTestDetails } from '$lib/types';
import { error, fail, redirect, type Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Check if the form has any location fields (state, district, block)
 */
function hasLocationFields(testData: TTestDetails): boolean {
	if (!testData?.form?.fields) return false;
	const locationFieldTypes = ['state', 'district', 'block'];
	return testData.form.fields.some((field) => locationFieldTypes.includes(field.field_type));
}

function setCandidateCookie(cookies: Cookies, testLink: string, candidateData: unknown) {
	cookies.set('sashakt-candidate', JSON.stringify(candidateData), {
		expires: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hour
		path: '/test/' + testLink,
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev
	});
}

function getExternalCandidateLaunch(url: URL) {
	const candidateUuid = url.searchParams.get('candidate_uuid');
	const candidateTestIdRaw = url.searchParams.get('candidate_test_id');

	if (!candidateUuid && !candidateTestIdRaw) return null;
	if (!candidateUuid || !candidateTestIdRaw) {
		throw error(400, 'Invalid external candidate launch');
	}

	const candidateTestId = Number(candidateTestIdRaw);
	if (!Number.isInteger(candidateTestId) || candidateTestId <= 0) {
		throw error(400, 'Invalid external candidate launch');
	}

	return {
		candidate_uuid: candidateUuid,
		candidate_test_id: candidateTestId
	};
}

export const load: PageServerLoad = async ({ locals, cookies, url, fetch }) => {
	const testData = locals.testData;
	if (!testData) throw redirect(302, '/');

	const externalLaunch = url ? getExternalCandidateLaunch(url) : null;
	if (externalLaunch) {
		const response = await fetch(`${BACKEND_URL}/candidate/external/start_test`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				test_link_uuid: testData.link,
				candidate_uuid: externalLaunch.candidate_uuid,
				candidate_test_id: externalLaunch.candidate_test_id
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData?.detail || errorData?.message || 'Failed to start test';
			throw error(response.status, errorMessage);
		}

		const candidateData = await response.json();
		setCandidateCookie(cookies, testData.link, candidateData);
		throw redirect(303, '/test/' + testData.link);
	}

	const candidate = getCandidate(cookies);

	// Fetch states if form has location fields (districts/blocks are fetched on-demand via search)
	let locations: { states: TState[] } | null = null;
	if (hasLocationFields(testData)) {
		try {
			const states = await getStates(testData.id);
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
				const useOmr =
					testData.omr === 'ALWAYS'
						? 'true'
						: testData.omr === 'OPTIONAL'
							? candidate.use_omr
							: undefined;
				testQuestionsResponse = await getTestQuestions(
					candidate.candidate_test_id,
					candidate.candidate_uuid,
					useOmr
				);
			}

			return {
				candidate,
				testData,
				timeLeft: timerResponse.time_left,
				testQuestions: testQuestionsResponse,
				locations
			};
		} catch (error) {
			console.error('Error fetching candidate data:', error);
			cookies.delete('sashakt-candidate', {
				path: '/test/' + testData.link,
				secure: !dev
			});
			throw redirect(303, '/test/' + testData.link);
		}
	}
	return {
		candidate: null,
		timeToBegin: locals.timeToBegin,
		testData,
		testQuestions: null,
		locations
	};
};

export const actions = {
	createCandidate: async ({ request, locals, fetch, cookies }) => {
		const testData = locals.testData;
		if (!testData) return fail(500, { error: 'Test not found' });
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
		const formResponsesStr = formData.get('formResponses') as string;
		const omrMode = formData.get('omrMode') as string;
		const requestBody: {
			test_link_uuid: string;
			device_info: unknown;
			form_responses?: Record<string, unknown>;
		} = {
			test_link_uuid: testData.link,
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
					const formFields = testData.form?.fields;
					if (formFields && formFields.length > 0) {
						const errors = validateForm(formFields, formResponses);
						if (Object.keys(errors).length > 0) {
							return fail(400, { error: 'Please fix the form errors and try again.' });
						}
					}
					requestBody.form_responses = formResponses;
				}
			} catch {
				if (testData.form?.fields?.length) {
					return fail(400, { error: 'Invalid form_responses JSON' });
				}
			}
		}

		try {
			const response = await fetch(`${BACKEND_URL}/candidate/start_test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage = errorData?.detail || errorData?.message || 'Failed to start test';
				return fail(response.status, { error: errorMessage });
			}
			const candidateData = await response.json();

			if (omrMode) {
				candidateData.use_omr = omrMode;
			}

			setCandidateCookie(cookies, testData.link, candidateData);
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
		const testData = locals.testData;
		if (!testData) return fail(500, { error: 'Test not found', submitTest: false });
		const candidate = getCandidate(cookies);
		if (!candidate) {
			return fail(400, { candidate, missing: true });
		}

		const candidateUrl = (purpose: string) => {
			return `${BACKEND_URL}/candidate/${purpose}/${candidate.candidate_test_id}?candidate_uuid=${candidate.candidate_uuid}`;
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

				if (testData.show_feedback_on_completion || testData.question_sets?.length) {
					try {
						const [feedbackResponse, testQuestionsData] = await Promise.all([
							fetch(
								`${BACKEND_URL}/candidate/${candidate.candidate_test_id}/review-feedback?candidate_uuid=${candidate.candidate_uuid}`,
								{ method: 'GET', headers: { accept: 'application/json' } }
							),
							getTestQuestions(candidate.candidate_test_id, candidate.candidate_uuid)
						]);
						testQuestions = testQuestionsData;
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
						}
					} catch (error) {
						console.error('Error fetching feedback:', error);
					}
				}

				cookies.delete('sashakt-candidate', {
					path: '/test/' + testData.link,
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
		const testData = locals.testData;
		if (!testData) throw redirect(302, '/');
		cookies.delete('sashakt-candidate', {
			path: '/test/' + testData.link,
			secure: !dev
		});

		redirect(301, `/test/${testData.link}`);
	}
} satisfies Actions;
