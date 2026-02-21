import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createMockCookies,
	createMockResponse,
	mockCandidate,
	mockTestData
} from '$lib/test-utils';
import { getCandidate } from '$lib/helpers/getCandidate';
import { getTestQuestions, getTimeLeft, getStates } from '$lib/server/test';
import { load, actions } from './+page.server';

// Mock environment variables
vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

vi.mock('$app/environment', () => ({
	dev: false
}));

// Mock the helper functions
vi.mock('$lib/helpers/getCandidate', () => ({
	getCandidate: vi.fn()
}));

vi.mock('$lib/server/test', () => ({
	getTestQuestions: vi.fn(),
	getTimeLeft: vi.fn(),
	getStates: vi.fn().mockResolvedValue([])
}));

// Mock SvelteKit functions
vi.mock('@sveltejs/kit', () => ({
	fail: (status: number, data: any) => ({ status, ...data }),
	redirect: (status: number, location: string) => {
		const error = new Error('Redirect');
		(error as any).status = status;
		(error as any).location = location;
		throw error;
	}
}));

describe('Page Server - load function', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should return candidate data when candidate exists', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(getTimeLeft).mockResolvedValue({ time_left: 1800 });
		vi.mocked(getTestQuestions).mockResolvedValue({
			question_revisions: [],
			question_pagination: 5
		});

		const mockCookies = createMockCookies();
		const result = await load({
			locals: { testData: mockTestData, timeToBegin: 300 },
			cookies: mockCookies
		} as any);

		expect(result.candidate).toEqual(mockCandidate);
		expect(result.timeLeft).toBe(1800);
		expect(result.testQuestions).toEqual({
			question_revisions: [],
			question_pagination: 5
		});
	});

	it('should return null candidate when no candidate cookie exists', async () => {
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockCookies = createMockCookies();
		const result = await load({
			locals: { testData: mockTestData, timeToBegin: 300 },
			cookies: mockCookies
		} as any);

		expect(result.candidate).toBeNull();
		expect(result.timeToBegin).toBe(300);
		expect(result.testQuestions).toBeNull();
	});

	it('should not fetch questions when time_left is 0', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(getTimeLeft).mockResolvedValue({ time_left: 0 });

		const mockCookies = createMockCookies();
		const result = await load({
			locals: { testData: mockTestData, timeToBegin: 300 },
			cookies: mockCookies
		} as any);

		expect(result.timeLeft).toBe(0);
		expect(result.testQuestions).toBeNull();
		expect(getTestQuestions).not.toHaveBeenCalled();
	});

	it('should fetch questions when time_left is null (unlimited)', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(getTimeLeft).mockResolvedValue({ time_left: null });
		vi.mocked(getTestQuestions).mockResolvedValue({
			question_revisions: [],
			question_pagination: 5
		});

		const mockCookies = createMockCookies();
		const result = await load({
			locals: { testData: mockTestData, timeToBegin: 300 },
			cookies: mockCookies
		} as any);

		expect(getTestQuestions).toHaveBeenCalled();
		expect(result.testQuestions).not.toBeNull();
	});

	it('should delete cookie and redirect on error', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);
		vi.mocked(getTimeLeft).mockRejectedValue(new Error('API Error'));

		const mockCookies = createMockCookies();

		await expect(
			load({
				locals: { testData: mockTestData, timeToBegin: 300 },
				cookies: mockCookies
			} as any)
		).rejects.toThrow('Redirect');

		expect(mockCookies.delete).toHaveBeenCalledWith('sashakt-candidate', expect.any(Object));
	});
});

describe('Page Server - createCandidate action', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const createMockFormData = (data: Record<string, string>) => {
		return {
			get: (key: string) => data[key] || null
		};
	};

	it('should create candidate successfully', async () => {
		// check no existing candidate
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockResponse = createMockResponse(mockCandidate);
		const mockFetch = vi.fn().mockResolvedValue(mockResponse);
		const mockCookies = createMockCookies();

		const result = await actions.createCandidate({
			request: {
				formData: () =>
					Promise.resolve(
						createMockFormData({
							deviceInfo: JSON.stringify({ browser: 'Chrome' }),
							entity: ''
						})
					)
			},
			locals: { testData: mockTestData },
			fetch: mockFetch,
			cookies: mockCookies
		} as any);

		expect(result.success).toBe(true);
		expect(result.candidateData).toEqual(mockCandidate);
		expect(mockCookies.set).toHaveBeenCalledWith(
			'sashakt-candidate',
			JSON.stringify(mockCandidate),
			expect.objectContaining({
				path: `/test/${mockTestData.link}`,
				httpOnly: true
			})
		);
	});

	it('should include entity in request when provided', async () => {
		// check no existing candidate
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockResponse = createMockResponse(mockCandidate);
		const mockFetch = vi.fn().mockResolvedValue(mockResponse);
		const mockCookies = createMockCookies();

		await actions.createCandidate({
			request: {
				formData: () =>
					Promise.resolve(
						createMockFormData({
							deviceInfo: JSON.stringify({ browser: 'Chrome' }),
							entity: 'entity-123'
						})
					)
			},
			locals: { testData: mockTestData },
			fetch: mockFetch,
			cookies: mockCookies
		} as any);

		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-backend.com/candidate/start_test/',
			expect.objectContaining({
				body: expect.stringContaining('entity_id')
			})
		);
	});

	it('should return fail when API returns error', async () => {
		// check no existing candidate
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockResponse = createMockResponse({}, { ok: false, status: 400 });
		const mockFetch = vi.fn().mockResolvedValue(mockResponse);
		const mockCookies = createMockCookies();

		const result = await actions.createCandidate({
			request: {
				formData: () =>
					Promise.resolve(
						createMockFormData({
							deviceInfo: JSON.stringify({ browser: 'Chrome' }),
							entity: ''
						})
					)
			},
			locals: { testData: mockTestData },
			fetch: mockFetch,
			cookies: mockCookies
		} as any);

		expect(result.status).toBe(400);
		expect(result.error).toBe('Failed to start test');
	});

	it('should return 500 on network error', async () => {
		// check no existing candidate
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
		const mockCookies = createMockCookies();

		const result = await actions.createCandidate({
			request: {
				formData: () =>
					Promise.resolve(
						createMockFormData({
							deviceInfo: JSON.stringify({ browser: 'Chrome' }),
							entity: ''
						})
					)
			},
			locals: { testData: mockTestData },
			fetch: mockFetch,
			cookies: mockCookies
		} as any);

		expect(result.status).toBe(500);
		expect(result.error).toBe('Cannot start test. Please check your internet connection.');
	});
});

describe('Page Server - submitTest action', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should submit test and return result', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockResult = { score: 85, passed: true };
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(createMockResponse({ success: true }, { status: 200 }))
			.mockResolvedValueOnce(createMockResponse(mockResult));

		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: mockFetch,
			locals: { testData: mockTestData }
		} as any);

		expect(result.submitTest).toBe(true);
		expect(result.result).toEqual(mockResult);
		expect(mockCookies.delete).toHaveBeenCalledWith('sashakt-candidate', expect.any(Object));
	});

	it('should return error message when backend returns 400', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const errorResponse = { detail: 'Test already submitted' };
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(createMockResponse(errorResponse, { status: 400, ok: false }));

		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: mockFetch,
			locals: { testData: mockTestData }
		} as any);

		expect(result.status).toBe(400);
		expect((result as any).error).toBe('Test already submitted');
		expect((result as any).submitTest).toBe(false);
	});

	it('should return default error message when backend 400 has no detail', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(createMockResponse({}, { status: 400, ok: false }));

		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: mockFetch,
			locals: { testData: mockTestData }
		} as any);

		expect(result.status).toBe(400);
		expect((result as any).error).toBe('Failed to submit test');
		expect((result as any).submitTest).toBe(false);
	});

	it('should return fail when candidate is missing', async () => {
		vi.mocked(getCandidate).mockReturnValue(null);

		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: vi.fn(),
			locals: { testData: mockTestData }
		} as any);

		expect(result.status).toBe(400);
		expect(result.missing).toBe(true);
	});

	it('should return fail when result fetch fails', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(createMockResponse({ success: true }, { status: 200 }))
			.mockResolvedValueOnce(createMockResponse({}, { ok: false, status: 500 }));

		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: mockFetch,
			locals: { testData: mockTestData }
		} as any);

		expect(result.status).toBe(400);
		expect(result.result).toBe(false);
	});

	it('should return submitTest false on non-200/400 status', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce(createMockResponse({}, { status: 500, ok: false }));

		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: mockFetch,
			locals: { testData: mockTestData }
		} as any);

		expect(result.submitTest).toBe(false);
	});

	it('should return 500 on network error', async () => {
		vi.mocked(getCandidate).mockReturnValue(mockCandidate);

		const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
		const mockCookies = createMockCookies();

		const result = await actions.submitTest({
			cookies: mockCookies,
			fetch: mockFetch,
			locals: { testData: mockTestData }
		} as any);

		expect(result.status).toBe(500);
		expect(result.error).toBe('Failed to submit test');
	});
});

describe('Page Server - reattempt action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should delete cookie and redirect', async () => {
		const mockCookies = createMockCookies();

		await expect(
			actions.reattempt({
				cookies: mockCookies,
				locals: { testData: mockTestData }
			} as any)
		).rejects.toThrow('Redirect');

		expect(mockCookies.delete).toHaveBeenCalledWith('sashakt-candidate', expect.any(Object));
	});
});
