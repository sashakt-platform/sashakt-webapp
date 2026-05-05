import { describe, it, expect } from 'vitest';
import { getQuestionResult } from './feedbackHelpers';
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

		it('returns unattempted for matrix-match questions', () => {
			expect(getQuestionResult(question_type_enum.MATRIXMATCH, '{}', [])).toBe('unattempted');
		});
	});
});
