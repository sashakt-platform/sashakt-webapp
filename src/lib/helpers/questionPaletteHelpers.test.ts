import { describe, it, expect } from 'vitest';
import {
	isQuestionAnswered,
	isQuestionBookmarked,
	countQuestionStatuses
} from './questionPaletteHelpers';
import type { TQuestion, TSelection } from '$lib/types';

// Helper to create mock questions
const createQuestion = (id: number, isMandatory: boolean): TQuestion => ({
	id,
	question_text: `Question ${id}`,
	instructions: '',
	question_type: 'single-choice' as any,
	options: [{ id: id * 10, key: 'A', value: 'Option A' }],
	subjective_answer_limit: 0,
	is_mandatory: isMandatory,
	marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
	media: null
});

// Helper to create mock selections
const createSelection = (
	questionId: number,
	response: number[] = [1],
	bookmarked: boolean = false
): TSelection => ({
	question_revision_id: questionId,
	response,
	visited: true,
	time_spent: 10,
	bookmarked
});

describe('isQuestionAnswered', () => {
	it('should return true when question has a response', () => {
		const selections = [createSelection(1, [101])];

		const result = isQuestionAnswered(1, selections);

		expect(result).toBe(true);
	});

	it('should return false when question has no selection', () => {
		const selections = [createSelection(2, [201])];

		const result = isQuestionAnswered(1, selections);

		expect(result).toBe(false);
	});

	it('should return false when question has empty response array', () => {
		const selections = [createSelection(1, [])];

		const result = isQuestionAnswered(1, selections);

		expect(result).toBe(false);
	});

	it('should return true when question has multiple responses', () => {
		const selections = [createSelection(1, [101, 102, 103])];

		const result = isQuestionAnswered(1, selections);

		expect(result).toBe(true);
	});

	it('should return false when selections array is empty', () => {
		const selections: TSelection[] = [];

		const result = isQuestionAnswered(1, selections);

		expect(result).toBe(false);
	});
});

describe('isQuestionBookmarked', () => {
	it('should return true when question is bookmarked', () => {
		const selections = [createSelection(1, [101], true)];

		const result = isQuestionBookmarked(1, selections);

		expect(result).toBe(true);
	});

	it('should return false when question is not bookmarked', () => {
		const selections = [createSelection(1, [101], false)];

		const result = isQuestionBookmarked(1, selections);

		expect(result).toBe(false);
	});

	it('should return false when question has no selection', () => {
		const selections = [createSelection(2, [201], true)];

		const result = isQuestionBookmarked(1, selections);

		expect(result).toBe(false);
	});

	it('should return false when selections array is empty', () => {
		const selections: TSelection[] = [];

		const result = isQuestionBookmarked(1, selections);

		expect(result).toBe(false);
	});

	it('should return true for bookmarked question with empty response', () => {
		const selections = [createSelection(1, [], true)];

		const result = isQuestionBookmarked(1, selections);

		expect(result).toBe(true);
	});
});

describe('countQuestionStatuses', () => {
	it('should count answered questions correctly', () => {
		const questions = [
			createQuestion(1, false),
			createQuestion(2, false),
			createQuestion(3, false)
		];
		const selections = [createSelection(1, [101]), createSelection(2, [201])];

		const result = countQuestionStatuses(questions, selections);

		expect(result.answered).toBe(2);
	});

	it('should count bookmarked questions correctly', () => {
		const questions = [
			createQuestion(1, false),
			createQuestion(2, false),
			createQuestion(3, false)
		];
		const selections = [
			createSelection(1, [101], true),
			createSelection(2, [201], false),
			createSelection(3, [], true)
		];

		const result = countQuestionStatuses(questions, selections);

		expect(result.bookmarked).toBe(2);
	});

	it('should count mandatory questions correctly', () => {
		const questions = [
			createQuestion(1, true),
			createQuestion(2, false),
			createQuestion(3, true),
			createQuestion(4, true)
		];
		const selections: TSelection[] = [];

		const result = countQuestionStatuses(questions, selections);

		expect(result.mandatory).toBe(3);
	});

	it('should count remaining mandatory questions correctly', () => {
		const questions = [
			createQuestion(1, true),
			createQuestion(2, true),
			createQuestion(3, true),
			createQuestion(4, false)
		];
		const selections = [createSelection(1, [101]), createSelection(2, [201])];

		const result = countQuestionStatuses(questions, selections);

		expect(result.remainingMandatory).toBe(1); // Question 3 not answered
	});

	it('should return zero remaining mandatory when all are answered', () => {
		const questions = [createQuestion(1, true), createQuestion(2, true)];
		const selections = [createSelection(1, [101]), createSelection(2, [201])];

		const result = countQuestionStatuses(questions, selections);

		expect(result.remainingMandatory).toBe(0);
	});

	it('should handle empty questions array', () => {
		const questions: TQuestion[] = [];
		const selections: TSelection[] = [];

		const result = countQuestionStatuses(questions, selections);

		expect(result.answered).toBe(0);
		expect(result.bookmarked).toBe(0);
		expect(result.mandatory).toBe(0);
		expect(result.remainingMandatory).toBe(0);
	});

	it('should not count empty responses as answered', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];
		const selections = [createSelection(1, []), createSelection(2, [201])];

		const result = countQuestionStatuses(questions, selections);

		expect(result.answered).toBe(1);
	});

	it('should count question as both answered and bookmarked', () => {
		const questions = [createQuestion(1, false)];
		const selections = [createSelection(1, [101], true)];

		const result = countQuestionStatuses(questions, selections);

		expect(result.answered).toBe(1);
		expect(result.bookmarked).toBe(1);
	});
});
