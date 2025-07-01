import { BACKEND_URL } from '$env/static/private';
import { getCandidate } from '$lib/helpers/getCandidate';
import { getTestQuestions, getTimeLeft } from '$lib/server/test';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const candidate = getCandidate(cookies);

	if (candidate && candidate.candidate_test_id && candidate.candidate_uuid) {
		try {
			const testQuestionsResponse = await getTestQuestions(
				candidate.candidate_test_id,
				candidate.candidate_uuid
			);

			const timerResponse = await getTimeLeft(
				candidate.candidate_test_id,
				candidate.candidate_uuid
			);

			return {
				candidate,
				testData: locals.testData,
				timeLeft: timerResponse.time_left,
				testQuestions: testQuestionsResponse
			};
		} catch (error) {
			console.error('Error fetching candidate data:', error);
			throw redirect(303, '/test/' + locals.testData.link);
		}
	}
	return { candidate: null, testData: locals.testData, testQuestions: null };
};

export const actions = {
	preTestTimer: async ({ locals, fetch }) => {
		const test_uuid = locals.testData?.link;

		try {
			const response = await fetch(`${BACKEND_URL}/test/public/time_left/${test_uuid}`, {
				method: 'GET',
				headers: { accept: 'application/json' }
			});
			if (!response.ok) {
				throw error(response.status, `Failed to fetch pre-test time: ${response.statusText}`);
			}
			const data = await response.json();
			return { timeToBegin: data.time_left };
		} catch (err) {
			console.error('Error fetching pre-test time:', err);
			throw error(500, 'Internal server error');
		}
	},

	createCandidate: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const { deviceInfo } = Object.fromEntries(formData.entries());

		const response = await fetch(`${BACKEND_URL}/candidate/start_test`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ test_id: locals.testData.id, device_info: deviceInfo })
		});
		if (!response.ok) {
			throw redirect(303, '/test/' + locals.testData.link);
		}
		const candidateData = await response.json();
		cookies.set('sashakt-candidate', JSON.stringify(candidateData), {
			expires: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hour
			path: '/test/' + locals.testData.link,
			httpOnly: true,
			sameSite: 'strict',
			secure: true
		});
		return {
			success: true,
			candidateData: candidateData
		};
	},

	submitTest: async ({ cookies, fetch }) => {
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

			if (response.status === 200 || response.status === 400) {
				const result = await fetch(candidateUrl('result'), {
					method: 'GET',
					headers: { accept: 'application/json' }
				});

				if (!result.ok) return fail(400, { result: false });

				return { result: await result.json() };
			}

			return { submit_test: await response.json() };
		} catch (error) {
			console.error('Error in submitTest:', error);
			return fail(500, { error: 'Failed to submit test' });
		}
	},

	reattempt: async ({ cookies, locals }) => {
		cookies.delete('sashakt-candidate', { path: '/test/' + locals.testData.link });

		redirect(301, `/test/${locals.testData.link}`);
	}
} satisfies Actions;
