import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse, mockCandidate, createMockCookies } from '$lib/test-utils';
import { getCandidate } from '$lib/helpers/getCandidate';
import { POST } from './+server';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

// Mock getCandidate
vi.mock('$lib/helpers/getCandidate', () => ({
	getCandidate: vi.fn()
}));

describe('POST /test/[slug]/api/current-position', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const createMockRequest = (body: any) => ({
		json: () => Promise.resolve(body)
	});

	it('should patch the current position to the backend', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ id: mockCandidate.candidate_test_id }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 7,
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			`http://test-backend.com/candidate/current_position/${mockCandidate.candidate_test_id}?candidate_uuid=${mockCandidate.candidate_uuid}`,
			expect.objectContaining({
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: expect.stringContaining('"current_question_revision_id":7')
			})
		);
	});

	it('should return 401 when cookie candidate is missing', async () => {
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockCookies = createMockCookies();
		const request = createMockRequest({ question_revision_id: 7, candidate: mockCandidate });
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBe('Session expired or test already submitted');
	});

	it('should return 401 when cookie candidate does not match request candidate', async () => {
		vi.mocked(getCandidate).mockReturnValue({
			candidate_uuid: 'different-uuid',
			candidate_test_id: 999
		});

		const mockCookies = createMockCookies();
		const request = createMockRequest({ question_revision_id: 7, candidate: mockCandidate });
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBe('Session mismatch');
	});

	it('should return 400 when question_revision_id is missing', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockCookies = createMockCookies();
		const request = createMockRequest({ candidate: mockCandidate });
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Missing required fields');
	});

	it('should preserve the backend detail when the position update is rejected', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse(
				{ detail: 'Test already submitted' },
				{ ok: false, status: 400 }
			) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({ question_revision_id: 7, candidate: mockCandidate });
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Test already submitted');
	});

	it('should return 500 when fetch throws', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

		const mockCookies = createMockCookies();
		const request = createMockRequest({ question_revision_id: 7, candidate: mockCandidate });
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Connection refused');
	});
});
