import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ViewFeedback from './ViewFeedback.svelte';
import {
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
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
			expect(screen.getAllByText('OF 2')).toHaveLength(2);
		});

		it('should display marks when marking_scheme is present', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('1 Marks')).toBeInTheDocument();
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
		it('should show error message when question is not found', () => {
			const feedback = [createFeedback(999, [1], [2])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('Question not found for feedback #1')).toBeInTheDocument();
		});

		it('should show empty message when feedback is empty', () => {
			const { container } = render(ViewFeedback, {
				props: { feedback: [], testQuestions: mockTestQuestionsResponse }
			});

			expect(container.querySelectorAll('[class*="shadow-md"]')).toHaveLength(0);
			expect(
				screen.getByText('No feedback available. You did not attempt any questions.')
			).toBeInTheDocument();
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

			expect(screen.getByText('Question not found for feedback #1')).toBeInTheDocument();
		});
	});
});
