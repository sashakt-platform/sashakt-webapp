// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { TTestDetails } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			testData?: TTestDetails;
			timeToBegin?: number;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
