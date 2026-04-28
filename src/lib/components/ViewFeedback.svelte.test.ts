import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ViewFeedback from './ViewFeedback.svelte';
import {
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockSubjectiveQuestion,
	mockSubjectiveQuestionNoLimit,
	mockNumericalIntegerQuestion,
	mockNumericalDecimalQuestion,
	mockSectionedTestQuestionsResponse,
	mockTestQuestionsResponse,
	mockQuestionWithMedia,
	mockImageMedia,
	mockYoutubeMedia,
	mockMatrixInputTextQuestion,
	mockMatrixInputNumberQuestion
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

		it('should display question badges', () => {
			const feedback = [createFeedback(1, [102], [102]), createFeedback(2, [201], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText('Q1')).toBeInTheDocument();
			expect(screen.getByText('Q2')).toBeInTheDocument();
			expect(screen.getByText('Q3')).toBeInTheDocument();
		});

		it('should display marks when marking_scheme is present', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getAllByText(/\d+ marks?/i)).toHaveLength(3);
		});

		it('should display question instructions when present', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.instructions)).toBeInTheDocument();
		});

		it('should render sectioned payloads in the existing flat feedback flow', () => {
			const feedback = [createFeedback(1, [102], [102]), createFeedback(2, [201], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockSectionedTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('A. 3')).toBeInTheDocument();
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
			expect(optionBLabel?.className).toContain('bg-success-subtle');
			expect(optionBLabel?.className).toContain('border-success');
		});

		it('should highlight wrong submitted answer with red class', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionALabel = Array.from(labels).find((l) => l.textContent?.includes('A. 3'));
			expect(optionALabel?.className).toContain('bg-error-subtle');
			expect(optionALabel?.className).toContain('border-error');
		});

		it('should not highlight options that are neither correct nor submitted', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionCLabel = Array.from(labels).find((l) => l.textContent?.includes('C. 5'));
			expect(optionCLabel?.className).not.toContain('bg-success-subtle');
			expect(optionCLabel?.className).not.toContain('bg-error-subtle');
		});

		it('should show green when candidate picked the correct answer', () => {
			const feedback = [createFeedback(1, [102], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const labels = container.querySelectorAll('label');
			const optionBLabel = Array.from(labels).find((l) => l.textContent?.includes('B. 4'));
			expect(optionBLabel?.className).toContain('bg-success-subtle');

			expect(optionBLabel?.className).not.toContain('bg-error-subtle');
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
			expect(optionA?.className).toContain('bg-success-subtle');

			const optionB = Array.from(labels).find((l) => l.textContent?.includes('B. 3'));
			expect(optionB?.className).toContain('bg-success-subtle');

			const optionC = Array.from(labels).find((l) => l.textContent?.includes('C. 4'));
			expect(optionC?.className).toContain('bg-error-subtle');

			const optionD = Array.from(labels).find((l) => l.textContent?.includes('D. 5'));
			expect(optionD?.className).not.toContain('bg-success-subtle');
			expect(optionD?.className).not.toContain('bg-error-subtle');
		});

		it('should display marks for multiple-choice question', () => {
			const feedback = [createFeedback(2, [201], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
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
			expect(optionB?.className).toContain('bg-success-subtle');

			const redLabels = Array.from(labels).filter((l) => l.className.includes('bg-error-subtle'));
			expect(redLabels).toHaveLength(0);
		});

		it('should handle multiple feedback entries with mixed question types', () => {
			const feedback = [createFeedback(1, [101], [102]), createFeedback(2, [201, 202], [201, 202])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('Q1')).toBeInTheDocument();
			expect(screen.getByText('Q2')).toBeInTheDocument();
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
			const feedback = [{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText(mockNumericalIntegerQuestion.question_text)).toBeInTheDocument();
		});

		it('should display the submitted integer answer', () => {
			const feedback = [{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText('8')).toBeInTheDocument();
		});

		it('should show Correct and apply green styling when integer answer exactly matches', () => {
			const feedback = [{ question_revision_id: 6, submitted_answer: '8', correct_answer: 8 }];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
			expect(container.querySelector('.bg-success-subtle.border-success')).toBeInTheDocument();
		});

		it('should show Incorrect and apply red styling when integer answer does not match', () => {
			const feedback = [{ question_revision_id: 6, submitted_answer: '5', correct_answer: 8 }];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
			expect(container.querySelector('.bg-error-subtle.border-error')).toBeInTheDocument();
		});

		it('should display the correct answer panel when integer answer is wrong', () => {
			const feedback = [{ question_revision_id: 6, submitted_answer: '5', correct_answer: 8 }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			// '5' (submitted) and '8' (correct answer in the panel) should both appear
			expect(screen.getByText('5')).toBeInTheDocument();
			expect(screen.getByText('8')).toBeInTheDocument();
		});

		it('should show Not Attempted when submitted_answer is empty', () => {
			const feedback = [{ question_revision_id: 6, submitted_answer: '', correct_answer: 8 }];

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
			const feedback = [{ question_revision_id: 6, submitted_answer: '8', correct_answer: null }];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			expect(container.querySelector('.border-border.bg-card')).toBeInTheDocument();
		});

		it('should not show Wrong mark in the response area when correct_answer is not provided', () => {
			const feedback = [{ question_revision_id: 6, submitted_answer: '8', correct_answer: null }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
			});

			// isNumericalAnswerCorrect returns null → no Wrong indicator on the response.
			// The correct-answer panel below still shows its own "Correct" label, so we
			// only assert that Wrong is absent.
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
		});

		describe('correct answer is zero (integer)', () => {
			it('should show Correct when submitted answer is "0" and correct_answer is 0', () => {
				const feedback = [{ question_revision_id: 6, submitted_answer: '0', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
				});

				expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
				expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
			});

			it('should show green styling when integer answer is 0 and correct answer is 0', () => {
				const feedback = [{ question_revision_id: 6, submitted_answer: '0', correct_answer: 0 }];

				const { container } = render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
				});

				expect(container.querySelector('.bg-success-subtle.border-success')).toBeInTheDocument();
			});

			it('should show Incorrect when submitted answer is non-zero and correct_answer is 0', () => {
				const feedback = [{ question_revision_id: 6, submitted_answer: '5', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
				});

				expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
			});

			it('should display "0" as the correct answer when integer response is wrong and correct_answer is 0', () => {
				const feedback = [{ question_revision_id: 6, submitted_answer: '5', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalInteger }
				});

				// '5' is the submitted wrong answer, '0' is the correct answer in the panel
				expect(screen.getByText('5')).toBeInTheDocument();
				expect(screen.getByText('0')).toBeInTheDocument();
			});
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

			expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
		});

		it('should show Correct when decimal answer is within 0.05 tolerance', () => {
			// |3.16 - 3.14| = 0.02 <= 0.05
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '3.16', correct_answer: 3.14 }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
		});

		it('should show Incorrect when decimal answer is outside 0.05 tolerance', () => {
			// |2.5 - 3.14| = 0.64 > 0.05
			const feedback = [{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
		});

		it('should apply green styling when decimal answer is correct', () => {
			const feedback = [
				{ question_revision_id: 7, submitted_answer: '3.14', correct_answer: 3.14 }
			];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(container.querySelector('.bg-success-subtle.border-success')).toBeInTheDocument();
		});

		it('should apply red styling when decimal answer is wrong', () => {
			const feedback = [{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(container.querySelector('.bg-error-subtle.border-error')).toBeInTheDocument();
		});

		it('should display the correct answer panel when decimal answer is wrong', () => {
			const feedback = [{ question_revision_id: 7, submitted_answer: '2.5', correct_answer: 3.14 }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
			});

			expect(screen.getByText('2.5')).toBeInTheDocument();
			expect(screen.getByText('3.14')).toBeInTheDocument();
		});

		it('should show Not Attempted when submitted_answer is empty', () => {
			const feedback = [{ question_revision_id: 7, submitted_answer: '', correct_answer: 3.14 }];

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

		describe('correct answer is zero (decimal)', () => {
			it('should show Correct when submitted answer is "0" and correct_answer is 0', () => {
				const feedback = [{ question_revision_id: 7, submitted_answer: '0', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
				});

				// |0 - 0| = 0 <= 0.5
				expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
				expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
			});

			it('should show Correct when decimal answer is within 0.05 tolerance of 0', () => {
				const feedback = [{ question_revision_id: 7, submitted_answer: '0.03', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
				});

				// |0.03 - 0| = 0.03 <= 0.05
				expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
			});

			it('should show Incorrect when decimal answer is outside 0.05 tolerance of 0', () => {
				const feedback = [{ question_revision_id: 7, submitted_answer: '0.6', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
				});

				// |0.6 - 0| = 0.6 > 0.05
				expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
			});

			it('should apply green styling when decimal answer is 0 and correct answer is 0', () => {
				const feedback = [{ question_revision_id: 7, submitted_answer: '0', correct_answer: 0 }];

				const { container } = render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
				});

				expect(container.querySelector('.bg-success-subtle.border-success')).toBeInTheDocument();
			});

			it('should display "0" as the correct answer when decimal response is wrong and correct_answer is 0', () => {
				const feedback = [{ question_revision_id: 7, submitted_answer: '0.6', correct_answer: 0 }];

				render(ViewFeedback, {
					props: { feedback, testQuestions: testQuestionsWithNumericalDecimal }
				});

				expect(screen.getByText('0.6')).toBeInTheDocument();
				expect(screen.getByText('0')).toBeInTheDocument();
			});
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

			// Integer correct: header badge shows "Correct: ..."
			// Decimal wrong: header badge shows "Incorrect: ..."
			expect(screen.getAllByText(/^Correct:/)).toHaveLength(1);
			expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
		});
	});

	describe('media support in feedback', () => {
		const testQuestionsWithMedia = {
			question_revisions: [mockQuestionWithMedia],
			question_pagination: 5
		};

		it('should render question-level media image in feedback', () => {
			const feedback = [createFeedback(10, [1001], [1002])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithMedia }
			});

			const images = screen.getAllByRole('img');
			const questionImage = images.find(
				(img) => img.getAttribute('src') === mockImageMedia.image!.url
			);
			expect(questionImage).toBeInTheDocument();
			expect(questionImage).toHaveAttribute('alt', mockImageMedia.image!.alt_text);
		});

		it('should render option-level media in feedback for single-choice', () => {
			const feedback = [createFeedback(10, [1001], [1002])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: testQuestionsWithMedia }
			});

			// Option B has YouTube embed media
			const iframes = container.querySelectorAll('iframe');
			const youtubeIframe = Array.from(iframes).find(
				(iframe) => iframe.getAttribute('src') === mockYoutubeMedia.external_media!.embed_url
			);
			expect(youtubeIframe).toBeInTheDocument();
		});

		it('should render option-level media in feedback for multi-choice', () => {
			const multiChoiceWithMedia = {
				...mockQuestionWithMedia,
				id: 11,
				question_type: 'multi-choice' as any
			};
			const testQuestions = {
				question_revisions: [multiChoiceWithMedia],
				question_pagination: 5
			};
			const feedback = [createFeedback(11, [1001], [1002])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions }
			});

			// Option B has YouTube embed media
			const iframes = container.querySelectorAll('iframe');
			const youtubeIframe = Array.from(iframes).find(
				(iframe) => iframe.getAttribute('src') === mockYoutubeMedia.external_media!.embed_url
			);
			expect(youtubeIframe).toBeInTheDocument();
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

		it('should show Pending evaluation badge for subjective question', () => {
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 4, submitted_answer: 'My answer', correct_answer: [] }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(screen.getByText('Pending evaluation')).toBeInTheDocument();
		});

		it('should show Pending evaluation badge even when subjective answer is empty', () => {
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [{ question_revision_id: 4, submitted_answer: '', correct_answer: [] }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(screen.getByText('Pending evaluation')).toBeInTheDocument();
		});

		it('should not show Correct/Incorrect badge for subjective question', () => {
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 4, submitted_answer: 'My answer', correct_answer: [] }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(screen.queryByText(/^Correct:/)).not.toBeInTheDocument();
			expect(screen.queryByText(/^Incorrect:/)).not.toBeInTheDocument();
		});

		it('should show reviewer note for subjective question with submitted answer', () => {
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 4, submitted_answer: 'My answer', correct_answer: [] }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(
				screen.getByText('Your answer will be reviewed and marked by an evaluator.')
			).toBeInTheDocument();
		});

		it('should show reviewer note even when subjective answer is not attempted', () => {
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [{ question_revision_id: 4, submitted_answer: '', correct_answer: [] }];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(
				screen.getByText('Your answer will be reviewed and marked by an evaluator.')
			).toBeInTheDocument();
		});

		it('should show character limit note when subjective_answer_limit is set', () => {
			// mockSubjectiveQuestion has subjective_answer_limit: 500
			const subjectiveOnlyQuestions = {
				question_revisions: [mockSubjectiveQuestion],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 4, submitted_answer: 'My answer', correct_answer: [] }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveOnlyQuestions }
			});

			expect(screen.getByText(/500/)).toBeInTheDocument();
		});

		it('should not show character limit note when subjective_answer_limit is 0', () => {
			// mockSubjectiveQuestionNoLimit has subjective_answer_limit: 0
			const subjectiveNoLimitQuestions = {
				question_revisions: [mockSubjectiveQuestionNoLimit],
				question_pagination: 5
			};
			const feedback = [
				{ question_revision_id: 5, submitted_answer: 'My answer', correct_answer: [] }
			];

			render(ViewFeedback, {
				props: { feedback, testQuestions: subjectiveNoLimitQuestions }
			});

			expect(screen.queryByText(/characters/i)).not.toBeInTheDocument();
		});
	});

	describe('matrix input question types (not applicable)', () => {
		it('should show Not Applicable for matrix-string question', () => {
			const testQuestions = {
				question_revisions: [mockMatrixInputTextQuestion],
				question_pagination: 5
			};
			const feedback = [
				{
					question_revision_id: mockMatrixInputTextQuestion.id,
					submitted_answer: '{"1":"Paris"}',
					correct_answer: []
				}
			];

			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText(mockMatrixInputTextQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('Not Applicable')).toBeInTheDocument();
		});

		it('should show Not Applicable for matrix-number question', () => {
			const testQuestions = {
				question_revisions: [mockMatrixInputNumberQuestion],
				question_pagination: 5
			};
			const feedback = [
				{
					question_revision_id: mockMatrixInputNumberQuestion.id,
					submitted_answer: '{"1":"42"}',
					correct_answer: []
				}
			];

			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText(mockMatrixInputNumberQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('Not Applicable')).toBeInTheDocument();
		});

		it('should show Not Applicable for matrix-input question', () => {
			const testQuestions = {
				question_revisions: [mockMatrixInputTextQuestion],
				question_pagination: 5
			};
			const feedback = [
				{
					question_revision_id: mockMatrixInputTextQuestion.id,
					submitted_answer: '{"1":"Paris"}',
					correct_answer: []
				}
			];

			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText(mockMatrixInputTextQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText('Not Applicable')).toBeInTheDocument();
		});

		it('should not render choice options or inputs for matrix input questions', () => {
			const testQuestions = {
				question_revisions: [mockMatrixInputTextQuestion],
				question_pagination: 5
			};
			const feedback = [
				{
					question_revision_id: mockMatrixInputTextQuestion.id,
					submitted_answer: '{"1":"Paris"}',
					correct_answer: []
				}
			];

			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
			expect(screen.queryAllByRole('textbox')).toHaveLength(0);
		});
	});
});
