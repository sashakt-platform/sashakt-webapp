import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * SvelteKit 3 requires environment variables to be declared up front. These are
 * surfaced through `$app/env/private` and `$app/env/public` (and the deprecated
 * `$env/static/*` aliases).
 */
export const variables = defineEnvVars({
	BACKEND_URL: {
		static: true,
		description: 'FastAPI backend URL. Server-only — never expose this to the browser.'
	},
	PUBLIC_APP_ENV: {
		public: true,
		static: true,
		description: 'Environment name (development/staging/production).'
	}
});
