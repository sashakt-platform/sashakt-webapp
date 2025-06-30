import { BACKEND_URL } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const GET = async ({ params, url }: RequestEvent) => {
	const candidate_test_id = params.candidate_test_id;
	const candidate_uuid = url.searchParams.get('candidate_uuid');

	if (!candidate_test_id || !candidate_uuid) {
		throw error(400, 'Missing required parameters');
	}

	try {
		const apiEndpoint = `${BACKEND_URL}/candidate/pretest_timer/${candidate_test_id}?candidate_uuid=${candidate_uuid}`;
		
		const response = await fetch(apiEndpoint, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});

		if (!response.ok) {
			throw error(response.status, `Failed to fetch pre-test time: ${response.statusText}`);
		}

		const data = await response.json();
		return json(data);
	} catch (err) {
		console.error('Error fetching pre-test time:', err);
		throw error(500, 'Internal server error');
	}
}; 