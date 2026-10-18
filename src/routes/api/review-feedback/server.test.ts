import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCandidate } from '$lib/test-utils';
import { getReviewPayload } from '$lib/server/test';
import { POST } from './+server';

vi.mock('$lib/server/test', () => ({
	getReviewPayload: vi.fn()
}));

describe('POST /api/review-feedback', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const call = (body: unknown) =>
		POST({ request: { json: () => Promise.resolve(body) }, fetch: mockFetch } as any);

	it('should return the review payload for the candidate', async () => {
		const feedback = [{ question_revision_id: 1, submitted_answer: [101], correct_answer: [102] }];
		const testQuestions = { question_revisions: [] };
		vi.mocked(getReviewPayload).mockResolvedValueOnce({ feedback, testQuestions });

		const response = await call({ candidate: mockCandidate });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ success: true, feedback, testQuestions });
		expect(getReviewPayload).toHaveBeenCalledWith(
			mockCandidate.candidate_test_id,
			mockCandidate.candidate_uuid,
			mockFetch
		);
	});

	it('should return 400 when candidate_uuid is missing', async () => {
		const response = await call({ candidate: { candidate_test_id: 1 } });
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({ success: false, error: 'Invalid candidate data' });
		expect(getReviewPayload).not.toHaveBeenCalled();
	});

	it('should return 400 when the body is not valid JSON', async () => {
		const response = await POST({
			request: { json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) },
			fetch: mockFetch
		} as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({ success: false, error: 'Invalid or missing JSON body' });
		expect(getReviewPayload).not.toHaveBeenCalled();
	});

	it('should return 400 when the body is JSON null', async () => {
		const response = await call(null);

		expect(response.status).toBe(400);
		expect(getReviewPayload).not.toHaveBeenCalled();
	});

	it('should return 400 when candidate is null', async () => {
		const response = await call({ candidate: null });

		expect(response.status).toBe(400);
		expect(getReviewPayload).not.toHaveBeenCalled();
	});

	it('should return 502 when the feedback could not be fetched', async () => {
		vi.mocked(getReviewPayload).mockResolvedValueOnce({
			feedback: null,
			testQuestions: { question_revisions: [] }
		});

		const response = await call({ candidate: mockCandidate });
		const data = await response.json();

		expect(response.status).toBe(502);
		expect(data.success).toBe(false);
	});

	it('should return 502 when the questions could not be fetched', async () => {
		vi.mocked(getReviewPayload).mockResolvedValueOnce({ feedback: [], testQuestions: null });

		const response = await call({ candidate: mockCandidate });

		expect(response.status).toBe(502);
	});
});
