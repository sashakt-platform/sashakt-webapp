import { json } from '@sveltejs/kit';
import { getReviewPayload } from '$lib/server/test';
import type { RequestHandler } from './$types';

/**
 * The answer review behind "View All Answers", fetched when the candidate opens
 * it. Identity comes from the body rather than the cookie because a normal
 * submit clears the cookie; the backend verifies the candidate uuid.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
	let candidate;
	try {
		({ candidate } = (await request.json()) ?? {});
	} catch {
		return json({ success: false, error: 'Invalid or missing JSON body' }, { status: 400 });
	}
	if (!candidate?.candidate_test_id || !candidate?.candidate_uuid) {
		return json({ success: false, error: 'Invalid candidate data' }, { status: 400 });
	}

	const { feedback, testQuestions } = await getReviewPayload(
		candidate.candidate_test_id,
		candidate.candidate_uuid,
		fetch
	);

	if (!feedback || !testQuestions) {
		return json({ success: false, error: 'Failed to load the answer review' }, { status: 502 });
	}

	return json({ success: true, feedback, testQuestions });
};
