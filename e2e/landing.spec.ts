import { test, expect } from '@playwright/test';

test.describe('Root landing', () => {
	test('renders the welcome heading', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { name: /Welcome to Sashakt/i })).toBeVisible();
	});
});
