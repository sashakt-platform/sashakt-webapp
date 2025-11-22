import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse, mockCandidate } from '$lib/test-utils';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

describe('POST /api/submit-test', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	// Import the handler dynamically to allow mocking
	const getHandler = async () => {
		const module = await import('./+server');
		return module.POST;
	};

	const createMockRequest = (body: any) => ({
		json: () => Promise.resolve(body)
	});

	it('should submit test successfully', async () => {
		const POST = await getHandler();

		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const request = createMockRequest({ candidate: mockCandidate });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(fetch).toHaveBeenCalledWith(
			`http://test-backend.com/candidate/submit_test/${mockCandidate.candidate_test_id}/?candidate_uuid=${mockCandidate.candidate_uuid}`,
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			})
		);
	});

	it('should return 400 when candidate_test_id is missing', async () => {
		const POST = await getHandler();

		const request = createMockRequest({ candidate: { candidate_uuid: 'uuid' } });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Invalid candidate data');
	});

	it('should return 400 when candidate_uuid is missing', async () => {
		const POST = await getHandler();

		const request = createMockRequest({ candidate: { candidate_test_id: 1 } });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Invalid candidate data');
	});

	it('should return 400 when candidate is null', async () => {
		const POST = await getHandler();

		const request = createMockRequest({ candidate: null });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
	});

	it('should return 500 when backend API fails', async () => {
		const POST = await getHandler();

		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({}, { ok: false, status: 500 }) as unknown as Response
		);

		const request = createMockRequest({ candidate: mockCandidate });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toContain('Failed to submit');
	});

	it('should return 500 when fetch throws error', async () => {
		const POST = await getHandler();

		vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

		const request = createMockRequest({ candidate: mockCandidate });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Network error');
	});
});
