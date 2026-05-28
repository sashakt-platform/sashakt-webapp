import { describe, it, expect } from 'vitest';
import { getQuestionResult, parseMatrixAnswer, getMatrixCellStatus } from './feedbackHelpers';
import { question_type_enum } from '$lib/types';

describe('getQuestionResult', () => {
	describe('single-choice', () => {
		it('returns correct when submitted matches correct answer', () => {
			expect(getQuestionResult(question_type_enum.SINGLE, [102], [102])).toBe('correct');
		});

		it('returns incorrect when submitted does not match correct answer', () => {
			expect(getQuestionResult(question_type_enum.SINGLE, [101], [102])).toBe('incorrect');
		});

		it('returns unattempted when submitted is empty array', () => {
			expect(getQuestionResult(question_type_enum.SINGLE, [], [102])).toBe('unattempted');
		});

		it('returns unattempted when submitted is null', () => {
			expect(getQuestionResult(question_type_enum.SINGLE, null, [102])).toBe('unattempted');
		});

		it('returns unattempted when submitted is undefined', () => {
			expect(getQuestionResult(question_type_enum.SINGLE, undefined, [102])).toBe('unattempted');
		});

		it('returns unattempted when correct answer is empty', () => {
			expect(getQuestionResult(question_type_enum.SINGLE, [102], [])).toBe('unattempted');
		});
	});

	describe('multi-choice', () => {
		it('returns correct when submitted matches all correct answers exactly', () => {
			expect(getQuestionResult(question_type_enum.MULTIPLE, [201, 202], [201, 202])).toBe(
				'correct'
			);
		});

		it('returns correct regardless of submission order', () => {
			expect(getQuestionResult(question_type_enum.MULTIPLE, [202, 201], [201, 202])).toBe(
				'correct'
			);
		});

		it('returns incorrect when submitted contains an extra wrong option', () => {
			expect(getQuestionResult(question_type_enum.MULTIPLE, [201, 202, 203], [201, 202])).toBe(
				'incorrect'
			);
		});

		it('returns incorrect when only a subset of correct options is selected', () => {
			expect(getQuestionResult(question_type_enum.MULTIPLE, [201], [201, 202])).toBe('incorrect');
		});

		it('returns incorrect when selected options are all wrong', () => {
			expect(getQuestionResult(question_type_enum.MULTIPLE, [203], [201, 202])).toBe('incorrect');
		});

		it('returns unattempted when submitted is empty array', () => {
			expect(getQuestionResult(question_type_enum.MULTIPLE, [], [201, 202])).toBe('unattempted');
		});
	});

	describe('numerical-integer', () => {
		it('returns correct when submitted exactly matches correct answer', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '8', 8)).toBe('correct');
		});

		it('returns incorrect when submitted does not match correct answer', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '5', 8)).toBe('incorrect');
		});

		it('returns unattempted when submitted is empty string', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '', 8)).toBe('unattempted');
		});

		it('returns unattempted when correct_answer is null', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '8', null)).toBe('unattempted');
		});

		it('returns correct when correct_answer is 0 and submitted is "0"', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '0', 0)).toBe('correct');
		});

		it('returns incorrect when correct_answer is 0 and submitted is non-zero', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '5', 0)).toBe('incorrect');
		});

		it('accepts correct_answer as number array (runtime coercion)', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALINTEGER, '8', [8])).toBe('correct');
		});
	});

	describe('numerical-decimal', () => {
		it('returns correct when submitted exactly matches', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '3.14', 3.14)).toBe('correct');
		});

		it('returns correct when difference is within 0.05 tolerance', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '3.16', 3.14)).toBe('correct');
		});

		it('returns incorrect when difference exceeds 0.05 tolerance', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '2.5', 3.14)).toBe('incorrect');
		});

		it('returns unattempted when submitted is empty string', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '', 3.14)).toBe('unattempted');
		});

		it('returns unattempted when correct_answer is null', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '3.14', null)).toBe(
				'unattempted'
			);
		});

		it('returns correct when correct_answer is 0 and submitted is "0"', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '0', 0)).toBe('correct');
		});

		it('returns correct when answer is within 0.05 of 0', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '0.03', 0)).toBe('correct');
		});

		it('returns incorrect when answer is outside 0.05 of 0', () => {
			expect(getQuestionResult(question_type_enum.NUMERICALDECIMAL, '0.6', 0)).toBe('incorrect');
		});
	});

	describe('non-gradable types (fallback)', () => {
		it('returns unattempted for subjective questions', () => {
			expect(getQuestionResult(question_type_enum.SUBJECTIVE, 'some answer', [])).toBe('unattempted');
		});
	});

	describe('matrix-match', () => {
		const correctAnswer = JSON.stringify({ '1': [10, 11], '2': [12] });
		const correctSubmitted = JSON.stringify({ '1': [10, 11], '2': [12] });
		const partialSubmitted = JSON.stringify({ '1': [10], '2': [12] });
		const wrongSubmitted = JSON.stringify({ '1': [11], '2': [13] });

		it('returns correct when all rows match exactly', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, correctSubmitted, correctAnswer)).toBe('correct');
		});

		it('returns correct regardless of column order within a row', () => {
			const reordered = JSON.stringify({ '1': [11, 10], '2': [12] });
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, reordered, correctAnswer)).toBe('correct');
		});

		it('returns incorrect when a row has missing columns', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, partialSubmitted, correctAnswer)).toBe('incorrect');
		});

		it('returns incorrect when a row has wrong columns', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, wrongSubmitted, correctAnswer)).toBe('incorrect');
		});

		it('returns unattempted when submitted is empty JSON object string', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, '{}', correctAnswer)).toBe('unattempted');
		});

		it('returns unattempted when correct answer is empty JSON object string', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, correctSubmitted, '{}')).toBe('unattempted');
		});

		it('returns unattempted when submitted is empty array (not attempted at all)', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, [], correctAnswer)).toBe('unattempted');
		});
	});
});

describe('parseMatrixAnswer', () => {
	it('parses a valid JSON string into Record<string, number[]>', () => {
		const raw = JSON.stringify({ '1': [10, 11], '2': [12] });
		expect(parseMatrixAnswer(raw)).toEqual({ '1': [10, 11], '2': [12] });
	});

	it('returns empty object for null', () => {
		expect(parseMatrixAnswer(null)).toEqual({});
	});

	it('returns empty object for undefined', () => {
		expect(parseMatrixAnswer(undefined)).toEqual({});
	});

	it('returns empty object for empty string', () => {
		expect(parseMatrixAnswer('')).toEqual({});
	});

	it('returns empty object for invalid JSON', () => {
		expect(parseMatrixAnswer('not-json')).toEqual({});
	});

	it('returns empty object when raw is a number array (wrong type)', () => {
		expect(parseMatrixAnswer([1, 2, 3] as any)).toEqual({});
	});
});

describe('getMatrixCellStatus', () => {
	const submitted = { '1': [10, 11], '2': [12] };
	const correct = { '1': [10, 11], '2': [12, 13] };

	it('returns correct when cell is in both submitted and correct', () => {
		expect(getMatrixCellStatus(1, 10, submitted, correct)).toBe('correct');
	});

	it('returns correct for another matching cell', () => {
		expect(getMatrixCellStatus(1, 11, submitted, correct)).toBe('correct');
	});

	it('returns missed when cell is in correct but not submitted', () => {
		expect(getMatrixCellStatus(2, 13, submitted, correct)).toBe('missed');
	});

	it('returns wrong when cell is submitted but not correct', () => {
		const wrongSubmitted = { '1': [10, 99] };
		expect(getMatrixCellStatus(1, 99, wrongSubmitted, correct)).toBe('wrong');
	});

	it('returns none when cell is neither submitted nor correct', () => {
		expect(getMatrixCellStatus(1, 50, submitted, correct)).toBe('none');
	});

	it('returns none for a row with no submitted or correct selections', () => {
		expect(getMatrixCellStatus(99, 10, submitted, correct)).toBe('none');
	});

	it('returns missed when submitted map is empty for that row', () => {
		expect(getMatrixCellStatus(2, 13, {}, correct)).toBe('missed');
	});
});
