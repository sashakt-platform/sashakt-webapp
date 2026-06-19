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

type ApiTest = { id: number; name: string };

/**
 * Look up a seeded (non-template) test in the backend and return a shareable
 * link UUID for it. The webapp's /test/[slug] route resolves the slug against
 * the backend's TestLink table — a TestLink is created lazily the first time
 * an admin requests one for a given test, so we list the seeded tests and ask
 * for a link on the first hit. The UUID isn't stable across seed runs, so
 * discovering it at test time beats pinning it in env.
 */
export async function getSeededTestSlug(request: APIRequestContext): Promise<string> {
	const { access_token } = await getAccessToken(request);
	const auth = { Authorization: `Bearer ${access_token}` };

	const listRes = await request.get(`${BACKEND_URL}/test/?is_template=false&page=1&size=1`, {
		headers: auth
	});
	if (!listRes.ok()) {
		throw new Error(`Failed to list tests (${listRes.status()}): ${await listRes.text()}`);
	}
	const list = (await listRes.json()) as { items: ApiTest[] };
	const test = list.items?.[0];
	if (!test) {
		throw new Error('No seeded non-template tests found in the backend');
	}

	const linkRes = await request.get(`${BACKEND_URL}/test/${test.id}/link`, { headers: auth });
	if (!linkRes.ok()) {
		throw new Error(
			`Failed to fetch shareable link for test ${test.id} (${linkRes.status()}): ${await linkRes.text()}`
		);
	}
	const { uuid } = (await linkRes.json()) as { uuid: string };
	return uuid;
}
