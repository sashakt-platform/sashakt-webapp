import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
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
	mockMatrixInputNumberQuestion,
	mockMatrixMatchQuestion,
	mockMatrixRatingQuestion
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
	describe('Answer Review heading', () => {
		it('should display the Answer Review heading', () => {
			render(ViewFeedback, {
				props: { feedback: [], testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByRole('heading', { name: 'Answer Review' })).toBeInTheDocument();
		});

		it('should display the Answer Review heading even when there are questions', () => {
			const feedback = [createFeedback(1, [102], [102])];

			render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(screen.getByRole('heading', { name: 'Answer Review' })).toBeInTheDocument();
		});
	});

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

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockSectionedTestQuestionsResponse }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(screen.getByText(mockMultipleChoiceQuestion.question_text)).toBeInTheDocument();
			expect(container.querySelector('label[for="1-A"]')).toBeInTheDocument();
		});

		it('should render question html and option html content', () => {
			const feedback = [createFeedback(1, [102], [102])];

			const { container } = render(ViewFeedback, {
				props: {
					feedback,
					testQuestions: {
						...mockTestQuestionsResponse,
						question_revisions: [
							{
								...mockSingleChoiceQuestion,
								question_text: '<p>What is <strong>2 + 2</strong>?</p>',
								instructions: '<p>Pick the <em>best</em> answer.</p>',
								options: [
									{ ...mockSingleChoiceQuestion.options[0], value: '<p>3</p>' },
									{ ...mockSingleChoiceQuestion.options[1], value: '<p><strong>4</strong></p>' },
									{ ...mockSingleChoiceQuestion.options[2], value: '<p>5</p>' },
									{ ...mockSingleChoiceQuestion.options[3], value: '<p>6</p>' }
								]
							},
							...mockTestQuestionsResponse.question_revisions.slice(1)
						]
					}
				}
			});

			expect(container.textContent).toContain('What is 2 + 2?');
			expect(container.textContent).toContain('Pick the best answer.');
			const optionBLabel = container.querySelector('label[for="1-B"]');
			expect(optionBLabel).toBeTruthy();
			expect(optionBLabel?.textContent).toContain('4');
			expect(screen.queryByText(/<p>What is/)).not.toBeInTheDocument();
		});

		it('should render section summaries when question sets are present', () => {
			const feedback = [createFeedback(1, [102], [102]), createFeedback(2, [201], [201, 202])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockSectionedTestQuestionsResponse }
			});

			expect(screen.getByText('Physics')).toBeInTheDocument();
			expect(screen.getByText('Section A')).toBeInTheDocument();
		});
	});

	describe('single-choice questions', () => {
		it('should render all options for a single-choice question', () => {
			const feedback = [createFeedback(1, [102], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(container.querySelector('label[for="1-A"]')).toBeInTheDocument();
			expect(container.querySelector('label[for="1-B"]')).toBeInTheDocument();
			expect(container.querySelector('label[for="1-C"]')).toBeInTheDocument();
			expect(container.querySelector('label[for="1-D"]')).toBeInTheDocument();
		});

		it('should highlight correct answer with green class', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const optionBLabel = container.querySelector('label[for="1-B"]');
			expect(optionBLabel?.className).toContain('bg-success-subtle');
			expect(optionBLabel?.className).toContain('border-success');
		});

		it('should highlight wrong submitted answer with red class', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const optionALabel = container.querySelector('label[for="1-A"]');
			expect(optionALabel?.className).toContain('bg-error-subtle');
			expect(optionALabel?.className).toContain('border-error');
		});

		it('should not highlight options that are neither correct nor submitted', () => {
			const feedback = [createFeedback(1, [101], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const optionCLabel = container.querySelector('label[for="1-C"]');
			expect(optionCLabel?.className).not.toContain('bg-success-subtle');
			expect(optionCLabel?.className).not.toContain('bg-error-subtle');
		});

		it('should show green when candidate picked the correct answer', () => {
			const feedback = [createFeedback(1, [102], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const optionBLabel = container.querySelector('label[for="1-B"]');
			expect(optionBLabel?.className).toContain('bg-success-subtle');
			expect(optionBLabel?.className).not.toContain('bg-error-subtle');
		});
	});

	describe('multiple-choice questions', () => {
		it('should render all options for a multiple-choice question', () => {
			const feedback = [createFeedback(2, [201, 202], [201, 202])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			expect(container.querySelector('label[for="2-A"]')).toBeInTheDocument();
			expect(container.querySelector('label[for="2-B"]')).toBeInTheDocument();
			expect(container.querySelector('label[for="2-C"]')).toBeInTheDocument();
			expect(container.querySelector('label[for="2-D"]')).toBeInTheDocument();
		});

		it('should highlight correct options green and wrong submitted options red', () => {
			const feedback = [createFeedback(2, [201, 203], [201, 202])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const optionA = container.querySelector('label[for="2-A"]');
			expect(optionA?.className).toContain('bg-success-subtle');

			const optionB = container.querySelector('label[for="2-B"]');
			expect(optionB?.className).toContain('bg-success-subtle');

			const optionC = container.querySelector('label[for="2-C"]');
			expect(optionC?.className).toContain('bg-error-subtle');

			const optionD = container.querySelector('label[for="2-D"]');
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

			expect(container.querySelectorAll('[class*="shadow-none"]')).toHaveLength(3);
		});

		it('should handle empty submitted_answer (unanswered question)', () => {
			const feedback = [createFeedback(1, [], [102])];

			const { container } = render(ViewFeedback, {
				props: { feedback, testQuestions: mockTestQuestionsResponse }
			});

			const optionB = container.querySelector('label[for="1-B"]');
			expect(optionB?.className).toContain('bg-success-subtle');

			const redLabels = container.querySelectorAll('[class*="bg-error-subtle"]');
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

	describe('matrix-input question feedback', () => {
		describe('text input type', () => {
			const testQuestions = {
				question_revisions: [mockMatrixInputTextQuestion],
				question_pagination: 5
			};
			const feedback = [
				{
					question_revision_id: mockMatrixInputTextQuestion.id,
					submitted_answer: '{"1":"Paris","2":"Tokyo"}',
					correct_answer: []
				}
			];

			it('should render question text', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getByText(mockMatrixInputTextQuestion.question_text)).toBeInTheDocument();
			});

			it('should render the rows label as a column header', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getByText('Country')).toBeInTheDocument();
			});

			it('should render the columns label as a column header', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getByText('Capital City')).toBeInTheDocument();
			});

			it('should render row values', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getByText('France')).toBeInTheDocument();
				expect(screen.getByText('Japan')).toBeInTheDocument();
			});

			it('should render one text input per row (2 rows = 2 inputs)', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getAllByRole('textbox')).toHaveLength(2);
			});

			it('should display submitted values inside the inputs', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
				const values = inputs.map((i) => i.value);
				expect(values).toContain('Paris');
				expect(values).toContain('Tokyo');
			});

			it('should render inputs as readonly', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
				expect(inputs.every((i) => i.readOnly)).toBe(true);
			});

			it('should show empty inputs when no answer was submitted', () => {
				const unattemptedFeedback = [
					{
						question_revision_id: mockMatrixInputTextQuestion.id,
						submitted_answer: '{}',
						correct_answer: []
					}
				];
				render(ViewFeedback, { props: { feedback: unattemptedFeedback, testQuestions } });

				const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
				expect(inputs.every((i) => i.value === '')).toBe(true);
			});

			it('should not show Not Applicable text', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.queryByText('Not Applicable')).not.toBeInTheDocument();
			});

			it('should not render radio buttons or checkboxes', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.queryAllByRole('radio')).toHaveLength(0);
				expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
			});
		});

		describe('number input type', () => {
			const testQuestions = {
				question_revisions: [mockMatrixInputNumberQuestion],
				question_pagination: 5
			};

			const feedback = [
				{
					question_revision_id: mockMatrixInputNumberQuestion.id,
					submitted_answer: '{"1":"42","2":"15"}',
					correct_answer: []
				}
			];

			it('should render the rows and columns labels', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getByText('Item')).toBeInTheDocument();
				expect(screen.getByText('Quantity')).toBeInTheDocument();
			});

			it('should render row values', () => {
				render(ViewFeedback, { props: { feedback, testQuestions } });

				expect(screen.getByText('Apples')).toBeInTheDocument();
				expect(screen.getByText('Oranges')).toBeInTheDocument();
			});

			it('should render number inputs with submitted values', () => {
				const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

				const inputs = container.querySelectorAll<HTMLInputElement>('input[type="number"]');
				const values = Array.from(inputs).map((i) => i.value);
				expect(values).toContain('42');
				expect(values).toContain('15');
			});

			it('should render number inputs as readonly', () => {
				const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

				const inputs = container.querySelectorAll<HTMLInputElement>('input[type="number"]');
				expect(Array.from(inputs).every((i) => i.readOnly)).toBe(true);
			});
		});
	});

	describe('matrix-match question feedback', () => {
		const correctAnswer = JSON.stringify({ 801: [901], 802: [902] });
		const submittedAnswer = JSON.stringify({ 801: [901, 902], 802: [] });

		const testQuestions = {
			question_revisions: [mockMatrixMatchQuestion],
			question_pagination: 5
		};

		const feedback = [
			{
				question_revision_id: mockMatrixMatchQuestion.id,
				submitted_answer: submittedAnswer,
				correct_answer: correctAnswer
			}
		];

		it('should render question text', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText(mockMatrixMatchQuestion.question_text)).toBeInTheDocument();
		});

		it('should render row label and column label', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('Column A')).toBeInTheDocument();
			expect(screen.getByText('Column B')).toBeInTheDocument();
		});

		it('should render row values', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('Apple')).toBeInTheDocument();
			expect(screen.getByText('Banana')).toBeInTheDocument();
		});

		it('should render column values', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('Red fruit')).toBeInTheDocument();
			expect(screen.getByText('Yellow fruit')).toBeInTheDocument();
		});

		it('should render column keys as table headers', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			const headers = screen.getAllByRole('columnheader');
			const headerTexts = headers.map((h) => h.textContent?.trim()).filter(Boolean);
			expect(headerTexts).toContain('P');
			expect(headerTexts).toContain('Q');
		});

		it('should render row keys in the table body', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = screen.getByRole('table');
			expect(within(table).getByText('A')).toBeInTheDocument();
			expect(within(table).getByText('B')).toBeInTheDocument();
		});

		it('should show correct styling for a cell that is submitted and correct', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			expect(table?.querySelector('.bg-success.border-success')).toBeInTheDocument();
		});

		it('should show wrong styling for a cell that is submitted but not correct', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			expect(table?.querySelector('.bg-error.border-error')).toBeInTheDocument();
		});

		it('should show missed styling for a cell that is correct but not submitted', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			expect(table?.querySelector('.border-success:not(.bg-success)')).toBeInTheDocument();
		});

		it('should show none styling for a cell that is neither submitted nor correct', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			expect(table?.querySelector('.bg-card.border-border')).toBeInTheDocument();
		});

		it('should render a check icon inside correct cells', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			const correctBox = table?.querySelector('.bg-success.border-success');
			expect(correctBox?.querySelector('svg')).toBeInTheDocument();
		});

		it('should render a check icon inside wrong cells', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			const wrongBox = table?.querySelector('.bg-error.border-error');
			expect(wrongBox?.querySelector('svg')).toBeInTheDocument();
		});

		it('should not render a check icon inside missed cells', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			const missedBox = table?.querySelector('.border-success:not(.bg-success)');
			expect(missedBox?.querySelector('svg')).not.toBeInTheDocument();
		});

		it('should not render a check icon inside none cells', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			const noneBox = table?.querySelector('.bg-card.border-border');
			expect(noneBox?.querySelector('svg')).not.toBeInTheDocument();
		});

		it('should render 4 status indicator boxes for 2×2 matrix', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const table = container.querySelector('table');
			expect(table?.querySelectorAll('.h-5.w-5')).toHaveLength(4);
		});

		it('should show Correct result badge when all rows match', () => {
			const allCorrectFeedback = [
				{
					question_revision_id: mockMatrixMatchQuestion.id,
					submitted_answer: correctAnswer,
					correct_answer: correctAnswer
				}
			];

			render(ViewFeedback, { props: { feedback: allCorrectFeedback, testQuestions } });

			expect(screen.getByText(/^Correct:/)).toBeInTheDocument();
		});

		it('should show Incorrect result badge when rows do not fully match', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText(/^Incorrect:/)).toBeInTheDocument();
		});

		it('should not show Not Applicable text', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.queryByText('Not Applicable')).not.toBeInTheDocument();
		});

		it('should not render checkboxes or radio buttons', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
		});

		it('should show Unattempted result badge when submitted answer is empty', () => {
			const unattemptedFeedback = [
				{
					question_revision_id: mockMatrixMatchQuestion.id,
					submitted_answer: '{}',
					correct_answer: correctAnswer
				}
			];

			render(ViewFeedback, { props: { feedback: unattemptedFeedback, testQuestions } });

			expect(screen.getByText(/^Not Attempted:/)).toBeInTheDocument();
		});
	});

	describe('matrix-rating question feedback', () => {
		const testQuestions = {
			question_revisions: [mockMatrixRatingQuestion],
			question_pagination: 5
		};

		const submittedAnswer = JSON.stringify({ '1': 2, '2': 3 });

		const feedback = [
			{
				question_revision_id: mockMatrixRatingQuestion.id,
				submitted_answer: submittedAnswer,
				correct_answer: []
			}
		];

		it('should render question text', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText(mockMatrixRatingQuestion.question_text)).toBeInTheDocument();
		});

		it('should render the rows label', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('Subjects')).toBeInTheDocument();
		});

		it('should render all column values as headers', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('Very difficult')).toBeInTheDocument();
			expect(screen.getByText('A little difficult')).toBeInTheDocument();
			expect(screen.getByText('Okay / manageable')).toBeInTheDocument();
		});

		it('should render column keys in parentheses', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('(1)')).toBeInTheDocument();
			expect(screen.getByText('(2)')).toBeInTheDocument();
			expect(screen.getByText('(3)')).toBeInTheDocument();
		});

		it('should render all row values', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getByText('Math')).toBeInTheDocument();
			expect(screen.getByText('Physics')).toBeInTheDocument();
			expect(screen.getByText('Chemistry')).toBeInTheDocument();
		});

		it('should render one radio button per row-column combination (3 rows × 3 cols = 9)', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.getAllByRole('radio')).toHaveLength(9);
		});

		it('should check the submitted radio for row 1 (Math → A little difficult)', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const row1Radios = container.querySelectorAll<HTMLInputElement>(
				`input[name="feedback-matrix-${mockMatrixRatingQuestion.id}-row-1"]`
			);
			const checked = Array.from(row1Radios).find((r) => r.checked);
			expect(checked?.value).toBe('2');
		});

		it('should check the submitted radio for row 2 (Physics → Okay / manageable)', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const row2Radios = container.querySelectorAll<HTMLInputElement>(
				`input[name="feedback-matrix-${mockMatrixRatingQuestion.id}-row-2"]`
			);
			const checked = Array.from(row2Radios).find((r) => r.checked);
			expect(checked?.value).toBe('3');
		});

		it('should leave all radios unchecked for an unanswered row', () => {
			const { container } = render(ViewFeedback, { props: { feedback, testQuestions } });

			const row3Radios = container.querySelectorAll<HTMLInputElement>(
				`input[name="feedback-matrix-${mockMatrixRatingQuestion.id}-row-3"]`
			);
			expect(Array.from(row3Radios).every((r) => !r.checked)).toBe(true);
		});

		it('should render all radios unchecked when submitted answer is empty', () => {
			const unattemptedFeedback = [
				{
					question_revision_id: mockMatrixRatingQuestion.id,
					submitted_answer: '{}',
					correct_answer: []
				}
			];
			render(ViewFeedback, { props: { feedback: unattemptedFeedback, testQuestions } });

			const radios = screen.getAllByRole('radio') as HTMLInputElement[];
			expect(radios.every((r) => !r.checked)).toBe(true);
		});

		it('should render all radios unchecked when no feedback entry exists', () => {
			render(ViewFeedback, { props: { feedback: [], testQuestions } });

			const radios = screen.getAllByRole('radio') as HTMLInputElement[];
			expect(radios.every((r) => !r.checked)).toBe(true);
		});

		it('should have disabled attribute on all radio buttons', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			const radios = screen.getAllByRole('radio') as HTMLInputElement[];
			expect(radios.every((r) => r.disabled)).toBe(true);
		});

		it('should not show Not Applicable text', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.queryByText('Not Applicable')).not.toBeInTheDocument();
		});

		it('should not show a result badge for matrix-rating questions', () => {
			render(ViewFeedback, { props: { feedback, testQuestions } });

			expect(screen.queryByText(/^Correct:/)).not.toBeInTheDocument();
			expect(screen.queryByText(/^Incorrect:/)).not.toBeInTheDocument();
		});
	});
});
