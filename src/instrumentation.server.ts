import { dev } from '$app/environment';
import { PUBLIC_APP_ENV } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://37c8921ed45b4e66d2a436a3b2451f1d@o412613.ingest.us.sentry.io/4510144958431232',

	// Disable Sentry in development mode
	enabled: !dev,

	tracesSampleRate: 1.0,

	// Enable logs to be sent to Sentry
	enableLogs: true,

	environment: PUBLIC_APP_ENV || 'development'

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});
