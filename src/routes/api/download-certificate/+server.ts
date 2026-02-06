import { BACKEND_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ success: false, error: 'Invalid or missing JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (typeof body !== 'object' || body === null || !('certificate_download_url' in body)) {
		return new Response(JSON.stringify({ success: false, error: 'Missing certificate URL' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { certificate_download_url } = body as { certificate_download_url: string };

	if (!certificate_download_url || typeof certificate_download_url !== 'string') {
		return new Response(JSON.stringify({ success: false, error: 'Invalid certificate URL' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Validate URL and prevent SSRF by ensuring it resolves to BACKEND_URL origin
	const trustedOrigin = new URL(BACKEND_URL).origin;
	let backendUrl: URL;
	try {
		backendUrl = new URL(certificate_download_url, trustedOrigin);
	} catch {
		return new Response(
			JSON.stringify({ success: false, error: 'Invalid certificate URL format' }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	if (backendUrl.origin !== trustedOrigin) {
		return new Response(
			JSON.stringify({ success: false, error: 'Certificate URL origin not allowed' }),
			{
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		const res = await fetch(backendUrl.href, {
			method: 'GET',
			headers: { Accept: 'image/png' }
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
				'Content-Type': res.headers.get('Content-Type') || 'image/png',
				'Content-Disposition':
					res.headers.get('Content-Disposition') || 'attachment; filename="certificate.png"'
			}
		});
	} catch {
		return new Response(JSON.stringify({ success: false, error: 'Certificate download failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
