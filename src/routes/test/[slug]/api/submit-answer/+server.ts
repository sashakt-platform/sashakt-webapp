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

	const {
		question_revision_id,
		response,
		candidate,
		bookmarked,
		is_reviewed
	}: {
		question_revision_id: number;
		response: number[] | string | null;
		candidate: TCandidate;
		bookmarked?: boolean;
		is_reviewed?: boolean;
	} = await request.json();

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
			`${BACKEND_URL}/candidate/submit_answer/${candidate.candidate_test_id}/?candidate_uuid=${candidate.candidate_uuid}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question_revision_id,
					response: response
						? typeof response === 'string'
							? response
							: JSON.stringify(response)
						: null,
					visited: true,
					bookmarked: bookmarked ?? false,
					is_reviwed: is_reviewed ?? false
				})
			}
		);

		if (!res.ok) {
			throw new Error(`Failed to save answer: ${res.status} ${res.statusText}`);
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
