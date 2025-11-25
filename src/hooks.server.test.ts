import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockTestData } from '$lib/test-utils';
import { getTestDetailsBySlug, getPreTestTimer } from '$lib/server/test';
import { handleTest } from './hooks.server';

// Mock the test server functions
vi.mock('$lib/server/test', () => ({
	getTestDetailsBySlug: vi.fn(),
	getPreTestTimer: vi.fn()
}));

// Mock Sentry
vi.mock('@sentry/sveltekit', () => ({
	sentryHandle: () => (event: any, resolve: any) => resolve(event),
	handleErrorWithSentry: () => () => {}
}));

describe('hooks.server - handleTest', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockEvent = (routeId: string | null, slug?: string) => ({
		route: { id: routeId },
		params: { slug },
		locals: {} as any
	});

	const mockResolve = vi.fn((event: any) => Promise.resolve(event));

	it('should redirect to home when route is /test but no slug', async () => {
		const event = createMockEvent('/test');

		await expect(handleTest({ event, resolve: mockResolve } as any)).rejects.toThrow();
	});

	it('should fetch test data and set locals for valid slug', async () => {
		vi.mocked(getTestDetailsBySlug).mockResolvedValue({ testData: mockTestData });
		vi.mocked(getPreTestTimer).mockResolvedValue({ timeToBegin: 300 });

		const event = createMockEvent('/test/[slug]', 'sample-test');

		await handleTest({ event, resolve: mockResolve } as any);

		expect(getTestDetailsBySlug).toHaveBeenCalledWith('sample-test');
		expect(getPreTestTimer).toHaveBeenCalledWith('sample-test');
		expect(event.locals.testData).toEqual(mockTestData);
		expect(event.locals.timeToBegin).toBe(300);
		expect(mockResolve).toHaveBeenCalledWith(event);
	});

	it('should skip fetching if testData already exists in locals', async () => {
		const event = createMockEvent('/test/[slug]', 'sample-test');
		event.locals.testData = mockTestData;

		await handleTest({ event, resolve: mockResolve } as any);

		expect(getTestDetailsBySlug).not.toHaveBeenCalled();
		expect(getPreTestTimer).not.toHaveBeenCalled();
		expect(mockResolve).toHaveBeenCalledWith(event);
	});

	it('should redirect to home when getTestDetailsBySlug throws error', async () => {
		vi.mocked(getTestDetailsBySlug).mockRejectedValue(new Error('Test not found'));

		const event = createMockEvent('/test/[slug]', 'invalid-slug');

		await expect(handleTest({ event, resolve: mockResolve } as any)).rejects.toThrow();
	});

	it('should redirect to home when getPreTestTimer throws error', async () => {
		vi.mocked(getTestDetailsBySlug).mockResolvedValue({ testData: mockTestData });
		vi.mocked(getPreTestTimer).mockRejectedValue(new Error('Timer not found'));

		const event = createMockEvent('/test/[slug]', 'sample-test');

		await expect(handleTest({ event, resolve: mockResolve } as any)).rejects.toThrow();
	});

	it('should pass through for non-test routes', async () => {
		const event = createMockEvent('/other-route');

		await handleTest({ event, resolve: mockResolve } as any);

		expect(getTestDetailsBySlug).not.toHaveBeenCalled();
		expect(getPreTestTimer).not.toHaveBeenCalled();
		expect(mockResolve).toHaveBeenCalledWith(event);
	});

	it('should pass through for null route', async () => {
		const event = createMockEvent(null);

		await handleTest({ event, resolve: mockResolve } as any);

		expect(getTestDetailsBySlug).not.toHaveBeenCalled();
		expect(mockResolve).toHaveBeenCalledWith(event);
	});
});
