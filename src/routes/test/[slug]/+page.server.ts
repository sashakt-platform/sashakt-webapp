import { BACKEND_URL } from '$env/static/private';
import { dev } from '$app/environment';
import { getCandidate } from '$lib/helpers/getCandidate';
import { getTestQuestions, getTimeLeft, getLocations, type TLocations } from '$lib/server/test';
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

	// Fetch locations if form has location fields
	let locations: TLocations | null = null;
	if (hasLocationFields(locals.testData)) {
		try {
			locations = await getLocations();
		} catch (error) {
			console.error('Error fetching locations:', error);
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
				if (Object.keys(formResponses).length > 0) {
					requestBody.form_responses = formResponses;
				}
			} catch {
				// Invalid JSON, ignore
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

				cookies.delete('sashakt-candidate', {
					path: '/test/' + locals.testData.link,
					secure: !dev
				});

				return { result: await result.json(), submitTest: true };
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
