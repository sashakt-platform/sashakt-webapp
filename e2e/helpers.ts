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

async function authHeaders(request: APIRequestContext): Promise<Record<string, string>> {
	const { access_token } = await getAccessToken(request);
	return { Authorization: `Bearer ${access_token}` };
}

function uniqueSuffix(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getCurrentUser(request: APIRequestContext): Promise<{ organization_id: number }> {
	const res = await request.get(`${BACKEND_URL}/users/me`, { headers: await authHeaders(request) });
	if (!res.ok()) {
		throw new Error(`/users/me failed (${res.status()}): ${await res.text()}`);
	}
	return (await res.json()) as { organization_id: number };
}

/**
 * The backend refuses `POST /candidate/start_test` when the current time falls
 * outside the org's `test_timings` window (defaults to 09:00–17:00 in whatever
 * TIMEZONE the backend is configured with). CI runners are on UTC and can fire
 * at any hour, so we widen the window to 00:00–23:59 once, up front. The change
 * is org-scoped and idempotent.
 */
async function ensureOpenTestingWindow(
	request: APIRequestContext,
	organizationId: number
): Promise<void> {
	const headers = await authHeaders(request);
	const getRes = await request.get(`${BACKEND_URL}/organization/${organizationId}/settings`, {
		headers
	});
	if (!getRes.ok()) {
		throw new Error(`Fetch org settings failed (${getRes.status()}): ${await getRes.text()}`);
	}
	const current = (await getRes.json()) as {
		settings: {
			test_timings: { value: { start_time?: string | null; end_time?: string | null } };
		};
	};
	const timings = current.settings.test_timings.value;
	if (timings.start_time === '00:00:00' && timings.end_time === '23:59:59') return;

	current.settings.test_timings.value.start_time = '00:00:00';
	current.settings.test_timings.value.end_time = '23:59:59';

	const putRes = await request.put(`${BACKEND_URL}/organization/${organizationId}/settings`, {
		headers: { ...headers, 'Content-Type': 'application/json' },
		data: { settings: current.settings }
	});
	if (!putRes.ok()) {
		throw new Error(`Widen org window failed (${putRes.status()}): ${await putRes.text()}`);
	}
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

// ──────────────────────────────────────────────────────────────────────────────
// Disposable test fixture — used by the full submission spec.
//
// We need a test with a known, minimal shape (one single-choice question with a
// deterministic correct option, a one-field text form, OMR off) so the spec can
// drive the UI without depending on the seeder's specific form fields or
// question mix. Cleanup is best-effort: once a candidate has submitted answers,
// the backend refuses to delete the test, question, or form, so we accept some
// row accumulation across runs and rely on unique-suffixed names to avoid
// collisions. The form name has a per-org unique constraint, so the suffix is
// load-bearing.

export type DisposableTest = {
	slug: string;
	testId: number;
	formId: number;
	questionId: number;
	correctOptionId: number;
	textFieldName: string;
};

export async function createDisposableTest(request: APIRequestContext): Promise<DisposableTest> {
	const headers = { ...(await authHeaders(request)), 'Content-Type': 'application/json' };
	const me = await getCurrentUser(request);
	await ensureOpenTestingWindow(request, me.organization_id);
	const suffix = uniqueSuffix();

	const formRes = await request.post(`${BACKEND_URL}/form/`, {
		headers,
		data: { name: `E2E Disposable Form ${suffix}`, is_active: true }
	});
	if (!formRes.ok()) {
		throw new Error(`Form create failed (${formRes.status()}): ${await formRes.text()}`);
	}
	const form = (await formRes.json()) as { id: number };

	const textFieldName = `e2e_text_${suffix.replace(/-/g, '_')}`;
	const fieldRes = await request.post(`${BACKEND_URL}/form/${form.id}/field/`, {
		headers,
		data: {
			field_type: 'text',
			label: 'Candidate Name',
			name: textFieldName,
			is_required: true,
			order: 1
		}
	});
	if (!fieldRes.ok()) {
		throw new Error(`Form field create failed (${fieldRes.status()}): ${await fieldRes.text()}`);
	}

	const correctOptionId = 1;
	const options = [
		{ id: correctOptionId, key: 'A', value: 'Correct answer' },
		{ id: 2, key: 'B', value: 'Wrong answer' }
	];
	const questionRes = await request.post(`${BACKEND_URL}/questions/`, {
		headers,
		data: {
			organization_id: me.organization_id,
			question_text: `E2E single-choice ${suffix}`,
			question_type: 'single-choice',
			options,
			correct_answer: [correctOptionId],
			is_mandatory: true,
			is_active: true,
			marking_scheme: { correct: 1, wrong: 0, skipped: 0 }
		}
	});
	if (!questionRes.ok()) {
		throw new Error(
			`Question create failed (${questionRes.status()}): ${await questionRes.text()}`
		);
	}
	const question = (await questionRes.json()) as {
		id: number;
		latest_question_revision_id: number;
	};

	const testRes = await request.post(`${BACKEND_URL}/test/`, {
		headers,
		data: {
			name: `E2E Disposable Test ${suffix}`,
			description: 'Created by Playwright; safe to delete',
			time_limit: 10,
			no_of_attempts: 1,
			question_pagination: 1,
			locale: 'en-US',
			omr: 'NEVER',
			form_id: form.id,
			candidate_profile: false,
			show_result: true,
			show_marks: true,
			marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
			question_revision_ids: [question.latest_question_revision_id]
		}
	});
	if (!testRes.ok()) {
		throw new Error(`Test create failed (${testRes.status()}): ${await testRes.text()}`);
	}
	const test = (await testRes.json()) as { id: number };

	const linkRes = await request.get(`${BACKEND_URL}/test/${test.id}/link`, {
		headers: await authHeaders(request)
	});
	if (!linkRes.ok()) {
		throw new Error(
			`Shareable link failed for test ${test.id} (${linkRes.status()}): ${await linkRes.text()}`
		);
	}
	const { uuid } = (await linkRes.json()) as { uuid: string };

	return {
		slug: uuid,
		testId: test.id,
		formId: form.id,
		questionId: question.id,
		correctOptionId,
		textFieldName
	};
}

/**
 * Best-effort teardown. Once a candidate has submitted answers the backend
 * refuses to delete the test/question/form (responses are referenced), so we
 * swallow non-2xx responses rather than fail the spec.
 */
export async function destroyDisposableTest(
	request: APIRequestContext,
	fixture: Pick<DisposableTest, 'testId' | 'questionId' | 'formId'>
): Promise<void> {
	const headers = await authHeaders(request);
	await request.delete(`${BACKEND_URL}/test/${fixture.testId}`, { headers });
	await request.delete(`${BACKEND_URL}/questions/${fixture.questionId}`, { headers });
	await request.delete(`${BACKEND_URL}/form/${fixture.formId}`, { headers });
}
