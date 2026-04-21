import { BACKEND_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { candidate } = await request.json();
	if (!candidate?.candidate_test_id || !candidate?.candidate_uuid) {
		return new Response(JSON.stringify({ success: false, error: 'Invalid candidate data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const res = await fetch(
			`${BACKEND_URL}/candidate/submit_test/${candidate.candidate_test_id}?candidate_uuid=${candidate.candidate_uuid}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			}
		);

		if (!res.ok) {
			throw new Error(`Failed to submit: ${res.status} ${res.statusText}`);
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		return new Response(JSON.stringify({ success: false, error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
