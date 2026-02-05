import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import QuestionCard from './QuestionCard.svelte';
import { fireEvent } from '@testing-library/svelte';
import {
	mockCandidate,
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockSubjectiveQuestion,
	mockSubjectiveQuestionNoLimit,
	createMockResponse
} from '$lib/test-utils';

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

describe('QuestionCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render question text', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
	});

	it('should render question number and total', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 3,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('OF 10')).toBeInTheDocument();
	});

	it('should render all options for single-choice question', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		mockSingleChoiceQuestion.options.forEach((option) => {
			expect(screen.getByText(new RegExp(`${option.key}\\. ${option.value}`))).toBeInTheDocument();
		});
	});

	it('should render all options for multiple-choice question', () => {
		render(QuestionCard, {
			props: {
				question: mockMultipleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		mockMultipleChoiceQuestion.options.forEach((option) => {
			expect(screen.getByText(new RegExp(`${option.key}\\. ${option.value}`))).toBeInTheDocument();
		});
	});

	it('should display mandatory indicator for mandatory questions', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion, // is_mandatory: true
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		// The asterisk indicates mandatory
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('should not display mandatory indicator for optional questions', () => {
		const optionalQuestion = {
			...mockSingleChoiceQuestion,
			is_mandatory: false
		};

		render(QuestionCard, {
			props: {
				question: optionalQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		// Check that there's no asterisk for optional questions
		const questionText = screen.getByText(optionalQuestion.question_text);
		expect(questionText.parentElement?.querySelector('.text-red-500')).not.toBeInTheDocument();
	});

	it('should display marks for the question', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion, // marking_scheme.correct: 1
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText('1 Mark')).toBeInTheDocument();
	});

	it('should display plural marks when more than 1', () => {
		render(QuestionCard, {
			props: {
				question: mockMultipleChoiceQuestion, // marking_scheme.correct: 2
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText('2 Marks')).toBeInTheDocument();
	});

	it('should display instructions when provided', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText(mockSingleChoiceQuestion.instructions)).toBeInTheDocument();
	});

	it('should render radio buttons for single-choice questions', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		const radioButtons = screen.getAllByRole('radio');
		expect(radioButtons).toHaveLength(mockSingleChoiceQuestion.options.length);
	});

	it('should render checkboxes for multiple-choice questions', () => {
		render(QuestionCard, {
			props: {
				question: mockMultipleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(mockMultipleChoiceQuestion.options.length);
	});

	it('should show selected state for previously answered question', () => {
		const selectedQuestions = [
			{
				question_revision_id: mockSingleChoiceQuestion.id,
				response: [mockSingleChoiceQuestion.options[1].id], // Selected option B
				visited: true,
				time_spent: 10
			}
		];

		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions
			}
		});

		const radioButtons = screen.getAllByRole('radio');
		expect(radioButtons[1]).toBeChecked();
	});

	describe('Bookmark functionality', () => {
		it('should display "Mark for review" button by default', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByRole('button', { name: /mark for review/i })).toBeInTheDocument();
		});

		it('should display "Unmark for review" when question is bookmarked', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [],
					visited: true,
					time_spent: 0,
					bookmarked: true
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByRole('button', { name: /unmark for review/i })).toBeInTheDocument();
		});

		it('should apply bookmark styling when question is bookmarked', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [],
					visited: true,
					time_spent: 0,
					bookmarked: true
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			const bookmarkButton = screen.getByRole('button', { name: /unmark for review/i });
			expect(bookmarkButton).toHaveClass('border-amber-500');
			expect(bookmarkButton).toHaveClass('bg-amber-50');
		});

		it('should not apply bookmark styling when question is not bookmarked', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const bookmarkButton = screen.getByRole('button', { name: /mark for review/i });
			expect(bookmarkButton).not.toHaveClass('border-amber-500');
			expect(bookmarkButton).not.toHaveClass('bg-amber-50');
		});

		it('should toggle bookmark state when clicked', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({ success: true }) as unknown as Response
			);

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const bookmarkButton = screen.getByRole('button', { name: /mark for review/i });
			await bookmarkButton.click();

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /unmark for review/i })).toBeInTheDocument();
			});
		});

		it('should call API when bookmark is toggled', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({ success: true }) as unknown as Response
			);

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const bookmarkButton = screen.getByRole('button', { name: /mark for review/i });
			await bookmarkButton.click();

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/submit-answer'),
					expect.objectContaining({
						method: 'POST',
						body: expect.stringContaining('"bookmarked":true')
					})
				);
			});
		});

		it('should preserve bookmark state with answered question', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 10,
					bookmarked: true
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			// Should be bookmarked
			expect(screen.getByRole('button', { name: /unmark for review/i })).toBeInTheDocument();

			// And should have the answer selected
			const radioButtons = screen.getAllByRole('radio');
			expect(radioButtons[0]).toBeChecked();
		});

		it('should show error message when bookmark API fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const bookmarkButton = screen.getByRole('button', { name: /mark for review/i });
			await bookmarkButton.click();

			await waitFor(() => {
				expect(screen.getByText(/failed to save bookmark/i)).toBeInTheDocument();
			});
		});

		it('should revert bookmark state on API failure', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const bookmarkButton = screen.getByRole('button', { name: /mark for review/i });
			await bookmarkButton.click();

			await waitFor(() => {
				// Should revert to "Mark for review" after failure
				expect(screen.getByRole('button', { name: /mark for review/i })).toBeInTheDocument();
			});
		});
	});

	describe('Subjective question functionality', () => {
		it('should render textarea for subjective questions', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByPlaceholderText(/type your answer here/i)).toBeInTheDocument();
		});

		it('should render Save Answer button for subjective questions', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
		});

		it('should disable Save Answer button when textarea is empty', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			expect(saveButton).toBeDisabled();
		});

		it('should enable Save Answer button when text is entered', async () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: 'My answer' } });

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			expect(saveButton).not.toBeDisabled();
		});

		it('should disable Save Answer button when only whitespace is entered', async () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: '   ' } });

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			expect(saveButton).toBeDisabled();
		});

		it('should display character count when limit is set', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByText(/0\/500/)).toBeInTheDocument();
			expect(screen.getByText(/characters/i)).toBeInTheDocument();
		});

		it('should update character count as user types', async () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: 'Hello' } });

			expect(screen.getByText(/5\/500/)).toBeInTheDocument();
		});

		it('should not display character count when no limit is set', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestionNoLimit,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.queryByText(/characters/i)).not.toBeInTheDocument();
		});

		it('should call API when Save Answer is clicked', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({ success: true }) as unknown as Response
			);

			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: 'My detailed answer' } });

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			await saveButton.click();

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/submit-answer'),
					expect.objectContaining({
						method: 'POST',
						body: expect.stringContaining('My detailed answer')
					})
				);
			});
		});

		it('should show error message when save fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: 'My answer' } });

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			await saveButton.click();

			await waitFor(() => {
				expect(screen.getByText(/failed to save your answer/i)).toBeInTheDocument();
			});
		});

		it('should display existing answer when question was previously answered', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSubjectiveQuestion.id,
					response: 'My previous answer',
					visited: true,
					time_spent: 60,
					bookmarked: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			expect(textarea).toHaveValue('My previous answer');
		});

		it('should not render radio buttons or checkboxes for subjective questions', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});

		it('should display marks for subjective question', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByText('5 Marks')).toBeInTheDocument();
		});
	});
});
