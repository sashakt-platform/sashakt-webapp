import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse, mockCandidate } from '$lib/test-utils';
import { POST } from './+server';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

describe('POST /api/submit-answer', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	const createMockRequest = (body: any) => ({
		json: () => Promise.resolve(body)
	});

	it('should submit answer successfully', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(fetch).toHaveBeenCalledWith(
			`http://test-backend.com/candidate/submit_answer/${mockCandidate.candidate_test_id}/?candidate_uuid=${mockCandidate.candidate_uuid}`,
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: expect.stringContaining('"question_revision_id":1')
			})
		);
	});

	it('should return 400 when question_revision_id is missing', async () => {
		const request = createMockRequest({
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Missing required fields');
	});

	it('should return 400 when candidate_test_id is missing', async () => {
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: { candidate_uuid: 'uuid' }
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Missing required fields');
	});

	it('should return 400 when candidate_uuid is missing', async () => {
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: { candidate_test_id: 1 }
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Missing required fields');
	});

	it('should handle multiple response options', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const request = createMockRequest({
			question_revision_id: 2,
			response: [201, 202, 203],
			candidate: mockCandidate
		});
		const response = await POST({ request } as any);

		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining('[201,202,203]')
			})
		);
	});

	it('should handle empty response array', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const request = createMockRequest({
			question_revision_id: 1,
			response: [],
			candidate: mockCandidate
		});
		const response = await POST({ request } as any);

		expect(response.status).toBe(200);
	});

	it('should return 500 when backend API fails', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({}, { ok: false, status: 500 }) as unknown as Response
		);

		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toContain('Failed to save answer');
	});

	it('should return 500 when fetch throws error', async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Connection refused');
	});
});
