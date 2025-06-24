// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			testData?: {
				id: number;
				name: string;
				time_limit: number;
				time_remaining_minutes?: number;
				start_time?: string;
				end_time?: string;
				candidate_test?: {
					start_time: string;
				};
				completion_message?: string;
				link: string;
				[key: string]: unknown;
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
