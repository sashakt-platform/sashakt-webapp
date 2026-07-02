import { defineConfig } from '@playwright/test';

// Load .env so BACKEND_URL / E2E_USERNAME / E2E_PASSWORD reach the test runner
// and the SvelteKit build step. process.loadEnvFile is built into Node ≥20.6.
try {
	process.loadEnvFile('.env');
} catch {
	// .env is optional — in CI these come from the environment directly
}

const PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'list' : 'html',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'npm run build && npm run preview',
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	}
});
