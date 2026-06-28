import type { TCandidate, TSelection, TTestSession } from '$lib/types';
import { LocalStorage } from '$lib/localStore.svelte';

export const createTestSessionStore = (candidate: TCandidate) => {
	const initialSession: TTestSession = {
		candidate,
		selections: [],
		currentPage: 1
	};

	return new LocalStorage<TTestSession>(
		`sashakt-session-${candidate.candidate_test_id}`,
		initialSession
	);
};

export type TSavedAnswer = {
	question_revision_id: number;
	response: string | null;
	visited?: boolean;
	bookmarked?: boolean;
};

const parseSavedResponse = (raw: string | null): number[] | string => {
	if (raw == null) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : raw;
	} catch {
		return raw;
	}
};

/**
 * Map the candidate's server-saved answers into the in-memory selection shape,
 * used to seed the UI when a device has no local cache yet (cross-device resume).
 */
export const mapSavedAnswersToSelections = (
	savedAnswers: TSavedAnswer[] | null | undefined
): TSelection[] => {
	if (!Array.isArray(savedAnswers)) return [];
	return savedAnswers.map((answer) => ({
		question_revision_id: answer.question_revision_id,
		response: parseSavedResponse(answer.response),
		visited: answer.visited ?? false,
		time_spent: 0,
		bookmarked: answer.bookmarked ?? false,
		is_reviewed: false
	}));
};
