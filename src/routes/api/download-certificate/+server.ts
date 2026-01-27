import { BACKEND_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { certificate_download_url }: { certificate_download_url: string } = await request.json();

	if (!certificate_download_url) {
		return new Response(JSON.stringify({ success: false, error: 'Missing certificate URL' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Extract base URL (without path like /api/v1) to avoid duplication
	const baseUrl = new URL(BACKEND_URL).origin;
	const backendUrl = certificate_download_url.startsWith('http')
		? certificate_download_url
		: `${baseUrl}${certificate_download_url}`;

	try {
		const res = await fetch(backendUrl, {
			method: 'GET',
			headers: { Accept: 'application/pdf' }
		});

		if (!res.ok) {
			return new Response(
				JSON.stringify({ success: false, error: `Backend error: ${res.status}` }),
				{
					status: res.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		return new Response(res.body, {
			status: 200,
			headers: {
				'Content-Type': res.headers.get('Content-Type') || 'application/pdf',
				'Content-Disposition':
					res.headers.get('Content-Disposition') || 'attachment; filename="certificate.pdf"'
			}
		});
	} catch {
		return new Response(JSON.stringify({ success: false, error: 'Certificate download failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
