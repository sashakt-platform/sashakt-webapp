import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse } from '$lib/test-utils';
import { GET } from './+server';

vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

const createMockUrl = (params: Record<string, string> = {}) => {
	const url = new URL('http://localhost/api/location/block');
	Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
	return url;
};

describe('GET /api/location/block', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it('should return block items on successful response', async () => {
		const mockItems = [
			{ id: 1, name: 'Block A' },
			{ id: 2, name: 'Block B' }
		];
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ items: mockItems }) as unknown as Response
		);

		const response = await GET({
			url: createMockUrl({ name: 'blk', district_ids: '3', test_id: '42' })
		} as any);
		const data = await response.json();

		expect(data.items).toEqual(mockItems);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('http://test-backend.com/location/block/'),
			expect.objectContaining({ method: 'GET' })
		);

		const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string;
		expect(fetchUrl).toContain('name=blk');
		expect(fetchUrl).toContain('district_ids=3');
		expect(fetchUrl).toContain('test_id=42');
		expect(fetchUrl).toContain('page=1');
		expect(fetchUrl).toContain('size=50');
	});

	it('should only include non-empty params in the fetch URL', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ items: [] }) as unknown as Response
		);

		await GET({ url: createMockUrl({ name: 'test' }) } as any);

		const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string;
		expect(fetchUrl).toContain('name=test');
		expect(fetchUrl).not.toContain('district_ids');
		expect(fetchUrl).not.toContain('test_id');
	});

	it('should always include page and size defaults', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ items: [] }) as unknown as Response
		);

		await GET({ url: createMockUrl() } as any);

		const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string;
		expect(fetchUrl).toContain('page=1');
		expect(fetchUrl).toContain('size=50');
	});

	it('should handle backend response with missing items key', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(createMockResponse({}) as unknown as Response);

		const response = await GET({ url: createMockUrl() } as any);
		const data = await response.json();

		expect(data.items).toEqual([]);
	});

	it('should return empty items with backend status on non-ok response', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({}, { ok: false, status: 404 }) as unknown as Response
		);

		const response = await GET({ url: createMockUrl({ name: 'test' }) } as any);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.items).toEqual([]);
	});

	it('should return 500 on fetch exception', async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

		const response = await GET({ url: createMockUrl({ name: 'test' }) } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.items).toEqual([]);
	});

	it('should call fetch with correct method and headers', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ items: [] }) as unknown as Response
		);

		await GET({ url: createMockUrl() } as any);

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				method: 'GET',
				headers: { accept: 'application/json' }
			})
		);
	});
});
