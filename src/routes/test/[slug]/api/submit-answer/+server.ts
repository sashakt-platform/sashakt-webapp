import { BACKEND_URL } from '$env/static/private';
import { getCandidate } from '$lib/helpers/getCandidate';
import type { TCandidate } from '$lib/types';
import type { RequestHandler } from './$types';

const jsonResponse = (body: Record<string, unknown>, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const cookieCandidate = getCandidate(cookies);
	if (!cookieCandidate) {
		return jsonResponse(
			{ success: false, error: 'Session expired or test already submitted' },
			401
		);
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
	}

	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
	}

	const typedPayload = payload as {
		question_revision_id: number;
		response: number[] | string | null;
		candidate: TCandidate;
		time_spent?: number | null;
		bookmarked?: boolean;
		is_reviewed?: boolean;
	};

	const { question_revision_id, response, candidate, bookmarked, is_reviewed } = typedPayload;

	if (
		cookieCandidate.candidate_test_id !== candidate?.candidate_test_id ||
		cookieCandidate.candidate_uuid !== candidate?.candidate_uuid
	) {
		return jsonResponse({ success: false, error: 'Session mismatch' }, 401);
	}

	if (!question_revision_id || !candidate?.candidate_test_id || !candidate?.candidate_uuid) {
		return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
	}

	try {
		const backendResponse =
			typeof response === 'string'
				? response.trim().length > 0
					? response
					: null
				: (response?.length ?? 0) > 0
					? JSON.stringify(response)
					: null;
		const backendPayload = {
			question_revision_id,
			response: backendResponse,
			visited: true,
			bookmarked: bookmarked ?? false,
			is_reviewed: is_reviewed ?? false,
			...('time_spent' in typedPayload ? { time_spent: typedPayload.time_spent } : {})
		};

		const res = await fetch(
			`${BACKEND_URL}/candidate/submit_answer/${candidate.candidate_test_id}?candidate_uuid=${candidate.candidate_uuid}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(backendPayload)
			}
		);

		if (!res.ok) {
			let errorMessage = `Failed to save answer: ${res.status} ${res.statusText}`;

			try {
				const errorData = await res.json();
				errorMessage = errorData?.detail || errorData?.message || errorData?.error || errorMessage;
			} catch {
				// Keep the status-based fallback when the backend error body is not JSON.
			}

			return jsonResponse({ success: false, error: errorMessage }, res.status);
		}

		let correct_answer = null;

		if (is_reviewed && response && response.length > 0) {
			try {
				const feedbackRes = await fetch(
					`${BACKEND_URL}/candidate/${candidate.candidate_test_id}/review-feedback?candidate_uuid=${candidate.candidate_uuid}&question_revision_ids=${question_revision_id}`,
					{ method: 'GET', headers: { accept: 'application/json' } }
				);
				if (feedbackRes.ok) {
					const feedbackData = await feedbackRes.json();
					if (feedbackData.length > 0) {
						correct_answer = feedbackData[0].correct_answer;
					}
				}
			} catch {
				// Keep answer save successful even if immediate feedback cannot be loaded.
			}
		}

		return jsonResponse({ success: true, correct_answer }, 200);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to submit answer';
		return jsonResponse({ success: false, error: errorMessage }, 500);
	}
};
