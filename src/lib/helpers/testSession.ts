import type { TCandidate, TTestSession } from '$lib/types';
import { LocalStorage } from '$lib/localStore.svelte';

export const createTestSessionStore = (candidate: TCandidate) => {
	const initialSession: TTestSession = {
		candidate,
		selections: []
	};

	return new LocalStorage<TTestSession>(
		`sashakt-session-${candidate.candidate_test_id}`,
		initialSession
	);
};
