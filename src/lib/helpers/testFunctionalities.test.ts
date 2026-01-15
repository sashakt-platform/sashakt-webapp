import { describe, it, expect } from 'vitest';
import { answeredAllMandatory, answeredCurrentMandatory } from './testFunctionalities';
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
const createSelection = (questionId: number): TSelection => ({
	question_revision_id: questionId,
	response: [1],
	visited: true,
	time_spent: 10,
	bookmarked: false
});

describe('answeredAllMandatory', () => {
	it('should return true when all mandatory questions are answered', () => {
		const questions = [createQuestion(1, true), createQuestion(2, true), createQuestion(3, false)];
		const selections = [createSelection(1), createSelection(2)];

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(true);
	});

	it('should return false when some mandatory questions are not answered', () => {
		const questions = [createQuestion(1, true), createQuestion(2, true), createQuestion(3, false)];
		const selections = [createSelection(1)]; // Missing question 2

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(false);
	});

	it('should return false when no mandatory questions are answered', () => {
		const questions = [createQuestion(1, true), createQuestion(2, true)];
		const selections: TSelection[] = [];

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(false);
	});

	it('should return true when there are no mandatory questions', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];
		const selections: TSelection[] = [];

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(true);
	});

	it('should return true when all questions are optional and some are answered', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];
		const selections = [createSelection(1)];

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(true);
	});

	it('should return true when questions array is empty', () => {
		const questions: TQuestion[] = [];
		const selections: TSelection[] = [];

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(true);
	});

	it('should correctly identify answered mandatory questions by question_revision_id', () => {
		const questions = [createQuestion(100, true), createQuestion(200, true)];
		const selections = [
			{ question_revision_id: 100, response: [1], visited: true, time_spent: 5 },
			{ question_revision_id: 200, response: [2], visited: true, time_spent: 10 }
		];

		const result = answeredAllMandatory(selections, questions);

		expect(result).toBe(true);
	});
});

describe('answeredCurrentMandatory', () => {
	const createPaginatedQuestions = () => [
		createQuestion(1, true), // Page 1
		createQuestion(2, false), // Page 1
		createQuestion(3, true), // Page 2
		createQuestion(4, true), // Page 2
		createQuestion(5, false), // Page 3
		createQuestion(6, false) // Page 3
	];

	it('should return true when current page mandatory questions are answered', () => {
		const questions = createPaginatedQuestions();
		const selections = [createSelection(1)]; // First page mandatory answered
		const currentPage = 1;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(true);
	});

	it('should return false when current page mandatory questions are not answered', () => {
		const questions = createPaginatedQuestions();
		const selections: TSelection[] = []; // No answers
		const currentPage = 1;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(false);
	});

	it('should check page 2 mandatory questions correctly by question ID', () => {
		const questions = createPaginatedQuestions();
		// Selections are filtered by question ID, not by array index
		// Page 2 has questions 3 and 4 (both mandatory)
		const selections = [
			createSelection(3), // Question 3 (mandatory on page 2)
			createSelection(4) // Question 4 (mandatory on page 2)
		];
		const currentPage = 2;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(true);
	});

	it('should return false when only some page 2 mandatory questions are answered', () => {
		const questions = createPaginatedQuestions();
		// Only question 3 answered, but question 4 is also mandatory on page 2
		const selections = [createSelection(3)];
		const currentPage = 2;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(false);
	});

	it('should return true for page with only optional questions', () => {
		const questions = createPaginatedQuestions();
		const selections: TSelection[] = []; // No answers needed
		const currentPage = 3;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(true);
	});

	it('should handle single question per page', () => {
		const questions = [createQuestion(1, true), createQuestion(2, false), createQuestion(3, true)];
		const selections = [createSelection(1)];
		const currentPage = 1;
		const questionsPerPage = 1;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(true);
	});

	it('should handle all questions on single page', () => {
		const questions = [createQuestion(1, true), createQuestion(2, true), createQuestion(3, false)];
		const selections = [createSelection(1), createSelection(2)];
		const currentPage = 1;
		const questionsPerPage = 10; // All on one page

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(true);
	});

	it('should filter selections by question ID regardless of selection order', () => {
		const questions = createPaginatedQuestions();
		// Selections in different order than questions, but should still work
		const selections = [
			createSelection(4), // Question 4 first
			createSelection(6), // Question from page 3
			createSelection(3), // Question 3 second
			createSelection(1) // Question from page 1
		];
		const currentPage = 2;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(true);
	});

	it('should correctly identify unanswered mandatory when selections are out of order', () => {
		const questions = createPaginatedQuestions();
		// Only question 4 answered, question 3 (mandatory) not answered
		const selections = [
			createSelection(1),
			createSelection(4) // Only one mandatory on page 2
		];
		const currentPage = 2;
		const questionsPerPage = 2;

		const result = answeredCurrentMandatory(currentPage, questionsPerPage, selections, questions);

		expect(result).toBe(false);
	});
});
