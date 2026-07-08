import { test, expect } from '@playwright/test';
import { createDisposableTest, destroyDisposableTest, type DisposableTest } from './helpers';

test.describe('Full submission flow', () => {
	let fixture: DisposableTest;

	test.beforeAll(async ({ request }) => {
		fixture = await createDisposableTest(request);
	});

	test.afterAll(async ({ request }) => {
		if (fixture) await destroyDisposableTest(request, fixture);
	});

	test('candidate fills the form, answers a single-choice question, and submits', async ({
		page
	}) => {
		await page.goto(`/test/${fixture.slug}`);

		// LandingPage → click Start Test
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await page.getByRole('button', { name: /Start Test/i }).click();

		// DynamicForm → fill the required text field, submit
		const textInput = page.locator(`input[name="${fixture.textFieldName}"]`);
		await expect(textInput).toBeVisible();
		await textInput.fill('E2E Candidate');
		await page.getByRole('button', { name: /Continue to Test/i }).click();

		// Question view → pick the correct option (auto-saves)
		const correctRadio = page.getByRole('radio', { name: 'Correct answer' });
		await expect(correctRadio).toBeVisible();
		await correctRadio.click();
		await expect(correctRadio).toBeChecked();

		// Submit dialog → confirm. "Submit Test" appears both as the trigger and as
		// nested text inside it, so click the first match (the trigger).
		await page
			.getByRole('button', { name: /^Submit Test$/i })
			.first()
			.click();
		await page
			.getByRole('dialog')
			.getByRole('button', { name: /^Submit$/i })
			.click();

		// TestResult should render with the test name visible somewhere on the page.
		await expect(page.getByText(/E2E Disposable Test/i).first()).toBeVisible({
			timeout: 15_000
		});
	});
});
