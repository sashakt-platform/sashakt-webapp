import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './+server';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://localhost:8000/api/v1'
}));

describe('POST /api/download-certificate', () => {
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

	const createMockPdfResponse = () => {
		const headers = new Map([
			['Content-Type', 'application/pdf'],
			['Content-Disposition', 'attachment; filename="certificate.pdf"']
		]);
		return {
			ok: true,
			status: 200,
			body: new ReadableStream(),
			headers: {
				get: (name: string) => headers.get(name) || null
			}
		};
	};

	it('should download certificate successfully', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(createMockPdfResponse() as unknown as Response);

		const request = createMockRequest({
			certificate_download_url: '/api/v1/certificate/download/test-uuid'
		});
		const response = await POST({ request } as any);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/pdf');
		expect(response.headers.get('Content-Disposition')).toBe(
			'attachment; filename="certificate.pdf"'
		);
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost:8000/api/v1/certificate/download/test-uuid',
			expect.objectContaining({
				method: 'GET',
				headers: { Accept: 'application/pdf' }
			})
		);
	});

	it('should use base URL origin to avoid path duplication', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(createMockPdfResponse() as unknown as Response);

		const request = createMockRequest({
			certificate_download_url: '/api/v1/certificate/download/test-uuid'
		});
		await POST({ request } as any);

		// Should use origin (http://localhost:8000) not full BACKEND_URL (http://localhost:8000/api/v1)
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost:8000/api/v1/certificate/download/test-uuid',
			expect.anything()
		);
	});

	it('should handle full URL in certificate_download_url', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(createMockPdfResponse() as unknown as Response);

		const fullUrl = 'https://other-server.com/certificate/download/test-uuid';
		const request = createMockRequest({
			certificate_download_url: fullUrl
		});
		await POST({ request } as any);

		expect(fetch).toHaveBeenCalledWith(fullUrl, expect.anything());
	});

	it('should return 400 when certificate_download_url is missing', async () => {
		const request = createMockRequest({});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Missing certificate URL');
	});

	it('should return 400 when certificate_download_url is empty', async () => {
		const request = createMockRequest({ certificate_download_url: '' });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Invalid certificate URL');
	});

	it('should return 400 when JSON body is invalid', async () => {
		const request = {
			json: () => Promise.reject(new Error('Invalid JSON'))
		};
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Invalid or missing JSON body');
	});

	it('should return 400 when body is not an object', async () => {
		const request = createMockRequest('not an object');
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Missing certificate URL');
	});

	it('should return 400 when certificate_download_url is not a string', async () => {
		const request = createMockRequest({ certificate_download_url: 123 });
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Invalid certificate URL');
	});

	it('should return backend error status when backend fails', async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 404
		} as unknown as Response);

		const request = createMockRequest({
			certificate_download_url: '/api/v1/certificate/download/invalid-uuid'
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Backend error: 404');
	});

	it('should return 500 when fetch throws error', async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

		const request = createMockRequest({
			certificate_download_url: '/api/v1/certificate/download/test-uuid'
		});
		const response = await POST({ request } as any);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Certificate download failed');
	});

	it('should use default Content-Type when backend does not provide one', async () => {
		const headers = new Map<string, string>();
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			status: 200,
			body: new ReadableStream(),
			headers: {
				get: (name: string) => headers.get(name) || null
			}
		} as unknown as Response);

		const request = createMockRequest({
			certificate_download_url: '/api/v1/certificate/download/test-uuid'
		});
		const response = await POST({ request } as any);

		expect(response.headers.get('Content-Type')).toBe('application/pdf');
		expect(response.headers.get('Content-Disposition')).toBe(
			'attachment; filename="certificate.pdf"'
		);
	});
});
