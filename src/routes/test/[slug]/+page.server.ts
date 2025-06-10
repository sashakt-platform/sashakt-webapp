import { BACKEND_URL } from '$env/static/private';
import { getTestQuestions } from '$lib/server/test';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const candidateCookie = cookies.get('sashakt-candidate');
	let candidate = null;
	if (candidateCookie) {
		try {
			candidate = JSON.parse(candidateCookie);
		} catch (error) {
			console.error('Invalid candidate cookie format:', error);
			// Clear the malformed cookie
			cookies.delete('sashakt-candidate', { path: '/test/' + locals.testData.link });
		}
	}

	if (candidate && candidate.candidate_test_id && candidate.candidate_uuid) {
		try {
			const testQuestionsResponse = await getTestQuestions(
				candidate.candidate_test_id,
				candidate.candidate_uuid
			);

			return {
				candidate,
				testData: locals.testData,
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
			success: true
		};
	}
};
