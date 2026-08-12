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
	time_spent?: number | null;
	bookmarked?: boolean;
	is_reviewed?: boolean;
	correct_answer?: number[] | number | null | string;
	solution?: string | null;
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
		time_spent: answer.time_spent ?? 0,
		bookmarked: answer.bookmarked ?? false,
		is_reviewed: answer.is_reviewed ?? false,
		correct_answer: answer.correct_answer ?? undefined,
		solution: answer.solution ?? undefined
	}));
};

/**
 * The selections a fresh page load should start with: the locally cached ones
 * if present, otherwise seeded from the server (resuming on another device).
 */
export const getInitialSelections = (
	localSelections: TSelection[],
	savedAnswers: TSavedAnswer[] | null | undefined
): TSelection[] =>
	localSelections.length > 0 ? localSelections : mapSavedAnswersToSelections(savedAnswers);

/**
 * The question index a fresh page load should start on: the exact server-saved
 * question if known (cross-device resume), else the first question of the
 * locally stored page (which only remembers the page, not the exact question).
 */
export const resolveInitialQuestionIndex = (
	savedRevisionId: number | null | undefined,
	questionIds: number[],
	perPage: number,
	storedPage: number | null | undefined
): number => {
	if (savedRevisionId != null) {
		const index = questionIds.indexOf(savedRevisionId);
		if (index >= 0) return index;
	}
	// The stored page comes from localStorage, so a stale or edited value could
	// point past the end of the test; keep the fallback inside the real range.
	const fallback = ((storedPage || 1) - 1) * perPage;
	return Math.min(Math.max(fallback, 0), Math.max(questionIds.length - 1, 0));
};
