import { BACKEND_URL } from '$env/static/private';
import { getCandidate } from '$lib/helpers/getCandidate';
import type { TCandidate } from '$lib/types';
import type { RequestHandler } from './$types';

const validEvents = new Set(['resume', 'heartbeat']);

export const POST: RequestHandler = async ({ request, cookies }) => {
	const cookieCandidate = getCandidate(cookies);
	if (!cookieCandidate) {
		return new Response(
			JSON.stringify({ success: false, error: 'Session expired or test already submitted' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const { candidate, event }: { candidate: TCandidate; event: string } = await request.json();

	if (
		cookieCandidate.candidate_test_id !== candidate?.candidate_test_id ||
		cookieCandidate.candidate_uuid !== candidate?.candidate_uuid
	) {
		return new Response(JSON.stringify({ success: false, error: 'Session mismatch' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!candidate?.candidate_test_id || !candidate?.candidate_uuid || !validEvents.has(event)) {
		return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const response = await fetch(
			`${BACKEND_URL}/candidate/timer_sync/${candidate.candidate_test_id}?candidate_uuid=${candidate.candidate_uuid}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ event })
			}
		);

		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			return new Response(
				JSON.stringify({
					success: false,
					error: data?.detail || data?.message || 'Failed to sync timer'
				}),
				{ status: response.status, headers: { 'Content-Type': 'application/json' } }
			);
		}

		return new Response(JSON.stringify(data), {
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
