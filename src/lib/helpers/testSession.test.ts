import { describe, it, expect } from 'vitest';
import {
	getInitialSelections,
	mapSavedAnswersToSelections,
	resolveInitialQuestionIndex
} from './testSession';

describe('mapSavedAnswersToSelections', () => {
	it('returns an empty list for null/undefined', () => {
		expect(mapSavedAnswersToSelections(null)).toEqual([]);
		expect(mapSavedAnswersToSelections(undefined)).toEqual([]);
	});

	it('parses a JSON-array response into numbers and carries flags + time', () => {
		const [selection] = mapSavedAnswersToSelections([
			{
				question_revision_id: 7,
				response: '[2]',
				visited: true,
				time_spent: 42,
				bookmarked: true
			}
		]);
		expect(selection).toEqual({
			question_revision_id: 7,
			response: [2],
			visited: true,
			time_spent: 42,
			bookmarked: true,
			is_reviewed: false
		});
	});

	it('defaults time_spent to 0 when the server has no recorded time', () => {
		const [selection] = mapSavedAnswersToSelections([{ question_revision_id: 7, response: '[2]' }]);
		expect(selection.time_spent).toBe(0);
	});

	it('keeps a subjective string response as-is', () => {
		const [selection] = mapSavedAnswersToSelections([
			{ question_revision_id: 8, response: 'my essay answer' }
		]);
		expect(selection.response).toBe('my essay answer');
		expect(selection.visited).toBe(false);
		expect(selection.bookmarked).toBe(false);
	});

	it('treats a null response as empty', () => {
		const [selection] = mapSavedAnswersToSelections([{ question_revision_id: 9, response: null }]);
		expect(selection.response).toEqual([]);
	});

	it('carries reviewed state and the already-seen correct answer', () => {
		const [selection] = mapSavedAnswersToSelections([
			{ question_revision_id: 7, response: '[2]', is_reviewed: true, correct_answer: [2] }
		]);
		expect(selection.is_reviewed).toBe(true);
		expect(selection.correct_answer).toEqual([2]);
	});
});

describe('getInitialSelections', () => {
	it('uses the local selections when present', () => {
		const local = [
			{ question_revision_id: 1, response: [1], visited: true, time_spent: 0, bookmarked: false }
		];
		expect(getInitialSelections(local, [{ question_revision_id: 9, response: '[3]' }])).toBe(local);
	});

	it('falls back to the server saved answers when local is empty', () => {
		const result = getInitialSelections([], [{ question_revision_id: 9, response: '[3]' }]);
		expect(result).toHaveLength(1);
		expect(result[0].question_revision_id).toBe(9);
		expect(result[0].response).toEqual([3]);
	});
});

describe('resolveInitialQuestionIndex', () => {
	const ids = [11, 12, 13, 14, 15, 16, 17];

	it('returns the exact index of the server-saved question', () => {
		// question 14 is index 3 → page 2 when perPage is 2, but the index is exact
		expect(resolveInitialQuestionIndex(14, ids, 2, 1)).toBe(3);
	});

	it('falls back to the first question of the stored page when no server question', () => {
		expect(resolveInitialQuestionIndex(null, ids, 2, 3)).toBe(4);
	});

	it('falls back when the saved question is not in the assigned list', () => {
		expect(resolveInitialQuestionIndex(999, ids, 5, 2)).toBe(5);
	});

	it('defaults to the first question when there is no stored page', () => {
		expect(resolveInitialQuestionIndex(null, ids, 5, undefined)).toBe(0);
	});
});
