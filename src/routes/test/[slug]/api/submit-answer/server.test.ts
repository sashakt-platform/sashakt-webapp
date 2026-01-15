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

describe('POST /test/[slug]/api/submit-answer', () => {
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

	it('should submit answer successfully', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
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

	it('should return 401 when cookie candidate is missing', async () => {
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Session expired or test already submitted');
	});

	it('should return 401 when cookie candidate does not match request candidate', async () => {
		vi.mocked(getCandidate).mockReturnValue({
			candidate_uuid: 'different-uuid',
			candidate_test_id: 999
		});

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Session mismatch');
	});

	it('should return 400 when question_revision_id is missing', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Missing required fields');
	});

	it('should return 401 when candidate_test_id is missing (session mismatch)', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: { candidate_uuid: 'uuid' }
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Session mismatch');
	});

	it('should return 401 when candidate_uuid is missing (session mismatch)', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: { candidate_test_id: 1 }
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Session mismatch');
	});

	it('should handle multiple response options', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 2,
			response: [201, 202, 203],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);

		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining('[201,202,203]')
			})
		);
	});

	it('should handle null response when question is unanswered', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: null,
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);

		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining('"response":null')
			})
		);
	});

	it('should include bookmarked flag in request', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate,
			bookmarked: true
		});
		const response = await POST({ request, cookies: mockCookies } as any);

		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining('"bookmarked":true')
			})
		);
	});

	it('should default bookmarked to false when not provided', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);

		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				body: expect.stringContaining('"bookmarked":false')
			})
		);
	});

	it('should return 500 when backend API fails', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({}, { ok: false, status: 500 }) as unknown as Response
		);

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toContain('Failed to save answer');
	});

	it('should return 500 when fetch throws error', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

		const mockCookies = createMockCookies();
		const request = createMockRequest({
			question_revision_id: 1,
			response: [101],
			candidate: mockCandidate
		});
		const response = await POST({ request, cookies: mockCookies } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Connection refused');
	});
});
