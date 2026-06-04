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

	const payload: {
		question_revision_id: number;
		response: number[] | string | null;
		candidate: TCandidate;
		time_spent?: number | null;
		bookmarked?: boolean;
		is_reviewed?: boolean;
	} = await request.json();

	const { question_revision_id, response, candidate, bookmarked, is_reviewed } = payload;

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
			...('time_spent' in payload ? { time_spent: payload.time_spent } : {})
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
			} catch {}

			return new Response(JSON.stringify({ success: false, error: errorMessage }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' }
			});
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
			} catch {}
		}

		return new Response(JSON.stringify({ success: true, correct_answer }), {
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
