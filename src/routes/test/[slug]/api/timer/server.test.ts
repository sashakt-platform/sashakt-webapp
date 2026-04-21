import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse, createMockCookies, mockCandidate } from '$lib/test-utils';
import { getCandidate } from '$lib/helpers/getCandidate';
import { POST } from './+server';

vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

vi.mock('$lib/helpers/getCandidate', () => ({
	getCandidate: vi.fn()
}));

describe('POST /test/[slug]/api/timer', () => {
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

	it('syncs timer successfully', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ time_left: 120 }) as unknown as Response
		);

		const response = await POST({
			request: createMockRequest({ candidate: mockCandidate, event: 'resume' }),
			cookies: createMockCookies()
		} as any);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ time_left: 120 });
		expect(fetch).toHaveBeenCalledWith(
			`http://test-backend.com/candidate/timer_sync/${mockCandidate.candidate_test_id}?candidate_uuid=${mockCandidate.candidate_uuid}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ event: 'resume' })
			}
		);
	});

	it('returns 401 when cookie candidate is missing', async () => {
		vi.mocked(getCandidate).mockReturnValue(null);

		const response = await POST({
			request: createMockRequest({ candidate: mockCandidate, event: 'resume' }),
			cookies: createMockCookies()
		} as any);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Session expired or test already submitted'
		});
	});

	it('returns 401 on session mismatch', async () => {
		vi.mocked(getCandidate).mockReturnValue({
			candidate_uuid: 'different-uuid',
			candidate_test_id: 99
		});

		const response = await POST({
			request: createMockRequest({ candidate: mockCandidate, event: 'resume' }),
			cookies: createMockCookies()
		} as any);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Session mismatch'
		});
	});

	it('returns 400 for invalid timer event', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const response = await POST({
			request: createMockRequest({ candidate: mockCandidate, event: 'pause' }),
			cookies: createMockCookies()
		} as any);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Missing required fields'
		});
	});

	it('returns backend error details when sync fails', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ detail: 'Test already submitted' }, { ok: false, status: 400 }) as unknown as Response
		);

		const response = await POST({
			request: createMockRequest({ candidate: mockCandidate, event: 'heartbeat' }),
			cookies: createMockCookies()
		} as any);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			success: false,
			error: 'Test already submitted'
		});
	});
});
