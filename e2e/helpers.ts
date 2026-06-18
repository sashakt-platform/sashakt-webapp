import type { APIRequestContext } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL;
export const E2E_USERNAME = process.env.E2E_USERNAME;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;

if (!BACKEND_URL) {
	throw new Error('BACKEND_URL is required for e2e tests — set it in .env');
}

type TokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

let cachedTokens: TokenResponse | null = null;

async function getAccessToken(request: APIRequestContext): Promise<TokenResponse> {
	if (cachedTokens) return cachedTokens;
	if (!E2E_USERNAME || !E2E_PASSWORD) {
		throw new Error(
			'E2E_USERNAME and E2E_PASSWORD are required to discover a test slug — set them in .env'
		);
	}
	const res = await request.post(`${BACKEND_URL}/login/access-token/`, {
		form: { username: E2E_USERNAME, password: E2E_PASSWORD }
	});
	if (!res.ok()) {
		throw new Error(`Login failed (${res.status()}): ${await res.text()}`);
	}
	cachedTokens = (await res.json()) as TokenResponse;
	return cachedTokens;
}

type ApiTest = { id: number; name: string; link: string };

/**
 * Look up a published (non-template) test seeded in the backend and return its
 * public link slug. The slug is what the candidate-facing /test/[slug] route
 * uses, and it isn't stable across seed runs, so we discover it at test time
 * instead of pinning it in env.
 */
export async function getSeededTestSlug(request: APIRequestContext): Promise<string> {
	const { access_token } = await getAccessToken(request);
	const res = await request.get(`${BACKEND_URL}/test/?is_template=false&page=1&size=50`, {
		headers: { Authorization: `Bearer ${access_token}` }
	});
	if (!res.ok()) {
		throw new Error(`Failed to list tests (${res.status()}): ${await res.text()}`);
	}
	const body = (await res.json()) as { items: ApiTest[] };
	const test = body.items?.find((t) => !!t.link);
	if (!test) {
		throw new Error('No seeded tests with a public link found in the backend');
	}
	return test.link;
}
