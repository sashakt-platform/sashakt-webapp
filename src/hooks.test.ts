import { getPreTestTimer, getTestDetailsBySlug } from '$lib/server/test';
import '@sveltejs/kit';
import { handleTest } from './hooks.server';

vi.mock('@sveltejs/kit', (original) => {
	const actual = original;
	return {
		...actual,
		redirect: vi.fn((status: number, location: string) => ({ status, location }))
	};
});

vi.mock('$lib/server/test');

describe('handleTest hook', () => {
	let resolve: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		resolve = vi.fn(() => new Response('OK'));
		vi.clearAllMocks();
	});

	it('should call resolve immediately if route does not start with /test', async () => {
		const event = {
			route: { id: '/home' },
			params: {},
			locals: {}
		};

		const response = await handleTest({ event: event as any, resolve });
		expect(resolve).toHaveBeenCalledWith(event);
		expect(response).toBeInstanceOf(Response);
	});

	it('should redirect if route starts with /test but slug is missing', async () => {
		const event = {
			route: { id: '/test' },
			params: {},
			locals: {}
		};

		await expect(handleTest({ event: event as any, resolve })).rejects.toMatchObject({
			status: 302,
			location: '/'
		});
	});

	it('should call resolve if testData already exists in locals', async () => {
		const event = {
			route: { id: '/test/abc' },
			params: { slug: 'abc' },
			locals: { testData: { id: 1 } }
		};

		const response = await handleTest({ event: event as any, resolve });
		expect(resolve).toHaveBeenCalledWith(event);
		expect(response).toBeInstanceOf(Response);
	});

	it('should fetch and store test data if not present', async () => {
		const fakeTestData = { id: 'test1' };
		const fakeTimer = { timeToBegin: 42 };

		(getTestDetailsBySlug as any).mockResolvedValueOnce({ testData: fakeTestData });
		(getPreTestTimer as any).mockResolvedValueOnce(fakeTimer);

		const event = {
			route: { id: '/test/abc' },
			params: { slug: 'abc' },
			locals: { testData: null, timeToBegin: null }
		};

		const response = await handleTest({ event: event as any, resolve });

		expect(getTestDetailsBySlug).toHaveBeenCalledWith('abc');
		expect(getPreTestTimer).toHaveBeenCalledWith('abc');
		expect(event.locals.testData).toEqual(fakeTestData);
		expect(event.locals.timeToBegin).toEqual(42);
		expect(resolve).toHaveBeenCalledWith(event);
		expect(response).toBeInstanceOf(Response);
	});

	it('should redirect if data fetching fails', async () => {
		(getTestDetailsBySlug as any).mockRejectedValueOnce(new Error('fetch failed'));

		const event = {
			route: { id: '/test/abc' },
			params: { slug: 'abc' },
			locals: {}
		};

		await expect(handleTest({ event: event as any, resolve })).rejects.toMatchObject({
			status: 302,
			location: '/'
		});
	});
});
