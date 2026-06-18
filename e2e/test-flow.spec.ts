import { test, expect } from '@playwright/test';
import { getSeededTestSlug } from './helpers';

test.describe('Test slug routing', () => {
	test('redirects to / when the slug does not match a backend test', async ({ page }) => {
		await page.goto('/test/this-slug-does-not-exist-xyz');

		await page.waitForURL('**/', { timeout: 10_000 });
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('heading', { name: /Welcome to Sashakt/i })).toBeVisible();
	});

	test('renders the test landing page for a seeded test slug', async ({ page, request }) => {
		const slug = await getSeededTestSlug(request);

		await page.goto(`/test/${slug}`);

		// LandingPage shows the test name as h1 and a "Test Overview" section.
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.getByText(/Test Overview/i)).toBeVisible();
	});
});
