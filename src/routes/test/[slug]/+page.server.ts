import { BACKEND_URL } from '$env/static/private';
import { dev } from '$app/environment';
import { getCandidate } from '$lib/helpers/getCandidate';
import { getTestQuestions, getTimeLeft } from '$lib/server/test';
import { fail, redirect } from '@sveltejs/kit';
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
		testQuestions: null
	};
};

export const actions = {
	createCandidate: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const deviceInfo = formData.get('deviceInfo') as string;
		const entity = formData.get('entity') as string;

		const requestBody: {
			test_id: number;
			device_info: unknown;
			candidate_profile?: {
				entity_id: string;
			};
		} = {
			test_id: locals.testData.id,
			device_info: deviceInfo
		};

		if (entity) {
			requestBody.candidate_profile = {
				entity_id: entity
			};
		}

		const response = await fetch(`${BACKEND_URL}/candidate/start_test/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		if (!response.ok) {
			throw redirect(303, '/test/' + locals.testData.link);
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

			if (response.status === 200 || response.status === 400) {
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
			return fail(500, { error: 'Failed to submit test' });
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
