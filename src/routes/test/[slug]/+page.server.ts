import { API_ENDPOINT } from '$env/static/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (cookies.get('sashakt-candidate')) {
		return { candidateId: cookies.get('sashakt-candidate'), testData: locals.testData };
	}
	return { candidateId: null, testData: locals.testData };
};

export const actions = {
	createCandidate: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const { deviceInfo } = Object.fromEntries(formData.entries());

		const response = await fetch(`${API_ENDPOINT}/candidate/start_test`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ test_id: locals.testData.id, device_info: deviceInfo })
		});
		if (!response.ok) {
			throw redirect(303, '/test/' + locals.testData.link);
		}
		const candidateData = await response.json();
		cookies.set('sashakt-candidate', candidateData.candidate_uuid, {
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
