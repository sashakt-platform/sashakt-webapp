import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ViewFeedback from './ViewFeedback.svelte';
import {
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockSubjectiveQuestion,
	mockNumericalIntegerQuestion,
	mockNumericalDecimalQuestion,
	mockTestQuestionsResponse
} from '$lib/test-utils';

const createFeedback = (
	questionRevisionId: number,
	submittedAnswer: number[],
	correctAnswer: number[]
) => ({
	question_revision_id: questionRevisionId,
	submitted_answer: submittedAnswer,
	correct_answer: correctAnswer
});

describe('ViewFeedback', () => {
	describe('rendering feedback cards', () => {
		it('should render a card for each feedback entry', () => {
			const feedback = [createFeedback(1, [102], [102]), createFeedback(2, [201, 203], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
		});

		it('should display question number and total count', () => {
			const feedback = [createFeedback(1, [102], [102]), createFeedback(2, [201], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('1')).toBeInTheDocument();
			expect(screen.getByText('2')).toBeInTheDocument();
			expect(screen.getByText('3')).toBeInTheDocument();
			expect(screen.getAllByText('OF 3')).toHaveLength(3);
		});

		it('should display marks when marking_scheme is present', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getAllByText(/\d+ Marks?/)).toHaveLength(3);
		});

		it('should display question instructions when present', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.instructions)).toBeInTheDocument();
		});
	});

	describe('single-choice questions', () => {
		it('should render all options for a single-choice question', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('A. 3')).toBeInTheDocument();
			expect(screen.getByText('B. 4')).toBeInTheDocument();
			expect(screen.getByText('C. 5')).toBeInTheDocument();
			expect(screen.getByText('D. 6')).toBeInTheDocument();
		});

		it('should highlight correct answer with green class', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionBLabel = Array.from(labels).find((l) => l.textContent?.includes('B. 4'));
			expect(optionBLabel?.className).toContain('bg-green-100');
			expect(optionBLabel?.className).toContain('border-green-500');
		});

		it('should highlight wrong submitted answer with red class', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionALabel = Array.from(labels).find((l) => l.textContent?.includes('A. 3'));
			expect(optionALabel?.className).toContain('bg-red-100');
			expect(optionALabel?.className).toContain('border-red-500');
		});

		it('should not highlight options that are neither correct nor submitted', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionCLabel = Array.from(labels).find((l) => l.textContent?.includes('C. 5'));
			expect(optionCLabel?.className).not.toContain('bg-green-100');
			expect(optionCLabel?.className).not.toContain('bg-red-100');
		});

		it('should show green when candidate picked the correct answer', () => {
			const feedback = [createFeedback(1, [102], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionBLabel = Array.from(labels).find((l) => l.textContent?.includes('B. 4'));
			expect(optionBLabel?.className).toContain('bg-green-100');

			expect(optionBLabel?.className).not.toContain('bg-red-100');
		});
	});

	describe('multiple-choice questions', () => {
		it('should render all options for a multiple-choice question', () => {
			const feedback = [createFeedback(2, [201, 202], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('A. 2')).toBeInTheDocument();
			expect(screen.getByText('B. 3')).toBeInTheDocument();
			expect(screen.getByText('C. 4')).toBeInTheDocument();
			expect(screen.getByText('D. 5')).toBeInTheDocument();
		});

		it('should highlight correct options green and wrong submitted options red', () => {
			const feedback = [createFeedback(2, [201, 203], [201, 202])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');

			const optionA = Array.from(labels).find((l) => l.textContent?.includes('A. 2'));
			expect(optionA?.className).toContain('bg-green-100');

			const optionB = Array.from(labels).find((l) => l.textContent?.includes('B. 3'));
			expect(optionB?.className).toContain('bg-green-100');

			const optionC = Array.from(labels).find((l) => l.textContent?.includes('C. 4'));
			expect(optionC?.className).toContain('bg-red-100');

			const optionD = Array.from(labels).find((l) => l.textContent?.includes('D. 5'));
			expect(optionD?.className).not.toContain('bg-green-100');
			expect(optionD?.className).not.toContain('bg-red-100');
		});

		it('should display marks for multiple-choice question', () => {
			const feedback = [createFeedback(2, [201], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('2 Marks')).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should show all questions even when feedback has extra entries', () => {
			const feedback = [createFeedback(999, [1], [2])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
		});

		it('should show all questions with empty feedback (unattempted)', () => {
			const { container } = render(ViewFeedback, {
				props: { feedback: [], testQuestions: mockTestQuestionsResponse }
			});

			expect(container.querySelectorAll('[class*="shadow-md"]')).toHaveLength(3);
		});

		it('should handle empty submitted_answer (unanswered question)', () => {
			const feedback = [createFeedback(1, [], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');

			const optionB = Array.from(labels).find((l) => l.textContent?.includes('B. 4'));
			expect(optionB?.className).toContain('bg-green-100');

			const redLabels = Array.from(labels).filter((l) => l.className.includes('bg-red-100'));
			expect(redLabels).toHaveLength(0);
		});

		it('should handle multiple feedback entries with mixed question types', () => {
			const feedback = [createFeedback(1, [101], [102]), createFeedback(2, [201, 202], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('1')).toBeInTheDocument();
			expect(screen.getByText('2')).toBeInTheDocument();
		});

		it('should handle testQuestions being null', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: null }
			});

			expect(
				screen.getByText('No feedback available. You did not attempt any questions.')
			).toBeInTheDocument();
		});
	});

	describe('numerical integer question feedback', () => {
		const testQuestionsWithNumericalInteger = {
			question_revisions: [mockNumericalIntegerQuestion],
			question_pagination: 5
		};

		it('should render numerical-integer question text', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText(mockNumericalIntegerQuestion.question_text)).toBeInTheDocument();
		});

		it('should display the submitted integer answer', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText('8')).toBeInTheDocument();
		});

		it('should show Correct and apply green styling when integer answer exactly matches', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 }
			];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText('Correct')).toBeInTheDocument();
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
			expect(container.querySelector('.bg-green-100.border-green-400')).toBeInTheDocument();
		});

		it('should show Wrong and apply red styling when integer answer does not match', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '5', correct_answer: 8 }
			];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText('Wrong')).toBeInTheDocument();
			expect(container.querySelector('.bg-red-100.border-red-400')).toBeInTheDocument();
		});

		it('should display the correct answer panel when integer answer is wrong', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '5', correct_answer: 8 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			// '5' (submitted) and '8' (correct answer in the panel) should both appear
			expect(screen.getByText('5')).toBeInTheDocument();
			expect(screen.getByText('8')).toBeInTheDocument();
		});

		it('should show Not Attempted when submitted_answer is empty', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '', correct_answer: 8 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
		});

		it('should show Not Attempted when numerical-integer question has no feedback entry', () => {
			render(ViewFeedback, {
				props: { feedback: [], testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
		});

		it('should apply gray styling when no correct_answer is provided', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: null }
			];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(container.querySelector('.border-gray-300.bg-white')).toBeInTheDocument();
		});

		it('should not show Wrong mark in the response area when correct_answer is not provided', () => {
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: null }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			// isNumericalAnswerCorrect returns null → no Wrong indicator on the response.
			// The correct-answer panel below still shows its own "Correct" label, so we
			// only assert that Wrong is absent.
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
		});
	});

	describe('numerical decimal question feedback', () => {
		const testQuestionsWithNumericalDecimal = {
			question_revisions: [mockNumericalDecimalQuestion],
			question_pagination: 5
		};

		it('should render numerical-decimal question text', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '3.14', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText(mockNumericalDecimalQuestion.question_text)).toBeInTheDocument();
		});

		it('should show Correct when decimal answer exactly matches', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '3.14', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('Correct')).toBeInTheDocument();
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
		});

		it('should show Correct when decimal answer is within 0.5 tolerance', () => {
			// |3.4 - 3.14| = 0.26 <= 0.5
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '3.4', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('Correct')).toBeInTheDocument();
		});

		it('should show Wrong when decimal answer is outside 0.5 tolerance', () => {
			// |2.5 - 3.14| = 0.64 > 0.5
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('Wrong')).toBeInTheDocument();
		});

		it('should apply green styling when decimal answer is correct', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '3.14', correct_answer: 3.14 }
			];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(container.querySelector('.bg-green-100.border-green-400')).toBeInTheDocument();
		});

		it('should apply red styling when decimal answer is wrong', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }
			];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(container.querySelector('.bg-red-100.border-red-400')).toBeInTheDocument();
		});

		it('should display the correct answer panel when decimal answer is wrong', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('2.5')).toBeInTheDocument();
			expect(screen.getByText('3.14')).toBeInTheDocument();
		});

		it('should show Not Attempted when submitted_answer is empty', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
		});

		it('should show Not Attempted when numerical-decimal question has no feedback entry', () => {
			render(ViewFeedback, {
				props: { feedback: [], testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
		});
	});

	describe('mixed numerical question types in feedback', () => {
		it('should render both integer and decimal numerical questions together', () => {
			const testQuestionsWithBoth = {
				question_revisions: [mockNumericalIntegerQuestion, mockNumericalDecimalQuestion],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 },
				{ question_revision_id: 7, submitted_answer: '3.14', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithBoth }
			});

			expect(screen.getByText(mockNumericalIntegerQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockNumericalDecimalQuestion.question_text)).toBeInTheDocument();
		});

		it('should independently show Correct for integer and Wrong for decimal', () => {
			const testQuestionsWithBoth = {
				question_revisions: [mockNumericalIntegerQuestion, mockNumericalDecimalQuestion],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 },
				// |2.5 - 3.14| = 0.64 > 0.5 → wrong
				{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithBoth }
			});

			// Integer correct: one "Correct" in its response area.
			// Decimal wrong: "Wrong" in its response area + the correct-answer panel
			// renders its own "Correct" label → two "Correct" elements total.
			expect(screen.getAllByText('Correct')).toHaveLength(2);
			expect(screen.getByText('Wrong')).toBeInTheDocument();
		});
	});

	describe('subjective question display', () => {
		it('should include subjective questions in feedback list', () => {
			const testQuestionsWithSubjective = {
				question_revisions: [
					mockSingleChoiceQuestion,
					mockMultipleChoiceQuestion,
					mockSubjectiveQuestion
				],
				question_pagination: 5
			};
			const feedback = [
				createFeedback(1, [102], [102]),
				createFeedback(2, [201], [201, 202]),
				{ question_revision_id: 4, submitted_answer: 'My subjective answer', correct_answer: [] }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithSubjective }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockSubjectiveQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('My subjective answer')).toBeInTheDocument();
		});

		it('should show not attempted for subjective question with no answer', () => {
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [{ question_revision_id: 4, submitted_answer: '', correct_answer: [] }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(screen.getByText(mockSubjectiveQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
		});
	});
});
