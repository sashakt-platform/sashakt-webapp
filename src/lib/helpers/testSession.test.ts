import { describe, it, expect } from 'vitest';
import { mapSavedAnswersToSelections } from './testSession';

describe('mapSavedAnswersToSelections', () => {
	it('returns an empty list for null/undefined', () => {
		expect(mapSavedAnswersToSelections(null)).toEqual([]);
		expect(mapSavedAnswersToSelections(undefined)).toEqual([]);
	});

	it('parses a JSON-array response into numbers and carries flags', () => {
		const [selection] = mapSavedAnswersToSelections([
			{ question_revision_id: 7, response: '[2]', visited: true, bookmarked: true }
		]);
		expect(selection).toEqual({
			question_revision_id: 7,
			response: [2],
			visited: true,
			time_spent: 0,
			bookmarked: true,
			is_reviewed: false
		});
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
});
