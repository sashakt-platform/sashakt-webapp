import { BACKEND_URL } from '$env/static/private';
import { getCandidate } from '$lib/helpers/getCandidate';
import type { TCandidate } from '$lib/types';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const cookieCandidate = getCandidate(cookies);
	if (!cookieCandidate) {
		return new Response(
			JSON.stringify({ success: false, error: 'Session expired or test already submitted' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	let body: { question_revision_id: number; candidate: TCandidate };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	const { question_revision_id, candidate } = body;

	if (
		cookieCandidate.candidate_test_id !== candidate?.candidate_test_id ||
		cookieCandidate.candidate_uuid !== candidate?.candidate_uuid
	) {
		return new Response(JSON.stringify({ success: false, error: 'Session mismatch' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!question_revision_id || !candidate?.candidate_test_id || !candidate?.candidate_uuid) {
		return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const res = await fetch(
			`${BACKEND_URL}/candidate/current_position/${candidate.candidate_test_id}?candidate_uuid=${candidate.candidate_uuid}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ current_question_revision_id: question_revision_id }),
				// Fires on every navigation, so a stalled backend must not keep the
				// request (and the position it carries) hanging around.
				signal: AbortSignal.timeout(10_000)
			}
		);

		if (!res.ok) {
			let errorMessage = `Failed to save current position: ${res.status} ${res.statusText}`;

			try {
				const errorData = await res.json();
				errorMessage = errorData?.detail || errorData?.message || errorData?.error || errorMessage;
			} catch {}

			return new Response(JSON.stringify({ success: false, error: errorMessage }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' }
			});
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
