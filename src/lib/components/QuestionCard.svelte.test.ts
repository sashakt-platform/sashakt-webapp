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
	mockNumericalIntegerQuestion,
	mockNumericalDecimalQuestion,
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
				time_spent: 10,
				bookmarked: false
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
					question: mockSubjectiveQuestion, // 500 char limit
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByText(/500 characters remaining/i)).toBeInTheDocument();
		});

		it('should update character count as user types', async () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion, // 500 char limit
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: 'Hello' } }); // 5 chars typed

			expect(screen.getByText(/495 characters remaining/i)).toBeInTheDocument();
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

		it('should show warning message when character limit is reached', async () => {
			const questionWithSmallLimit = {
				...mockSubjectiveQuestion,
				subjective_answer_limit: 10
			};

			render(QuestionCard, {
				props: {
					question: questionWithSmallLimit,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: '1234567890' } }); // exactly 10 chars

			expect(screen.getByText(/0 characters remaining/i)).toBeInTheDocument();
			expect(screen.getByText(/character limit reached/i)).toBeInTheDocument();
		});

		it('should not show warning message when under character limit', async () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion, // 500 char limit
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: 'Hello' } }); // 5 chars typed

			expect(screen.getByText(/495 characters remaining/i)).toBeInTheDocument();
			expect(screen.queryByText(/character limit reached/i)).not.toBeInTheDocument();
		});

		it('should apply red styling to character count when limit is reached', async () => {
			const questionWithSmallLimit = {
				...mockSubjectiveQuestion,
				subjective_answer_limit: 5
			};

			const { container } = render(QuestionCard, {
				props: {
					question: questionWithSmallLimit,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const textarea = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(textarea, { target: { value: '12345' } });

			const charCountSpan = container.querySelector('.text-red-500');
			expect(charCountSpan).toBeInTheDocument();
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

	describe('Inline feedback', () => {
		it('should show feedback button when question is answered even without correct_answer', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 10,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions,
					showFeedback: true
				}
			});

			expect(screen.getByRole('button', { name: /view Result/i })).toBeInTheDocument();
		});

		it('should not show feedback button when question is unanswered', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [],
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
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

			expect(screen.queryByRole('button', { name: /view Result/i })).not.toBeInTheDocument();
		});

		it('should show feedback button when question is answered', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 10,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions,
					showFeedback: true
				}
			});

			expect(screen.getByRole('button', { name: /view Result/i })).toBeInTheDocument();
		});

		it('should render locked state immediately when is_reviewed is true', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 10,
					correct_answer: [mockSingleChoiceQuestion.options[1].id],
					is_reviewed: true,
					bookmarked: false
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

			expect(screen.queryByRole('button', { name: /view Result/i })).not.toBeInTheDocument();

			const radioButtons = screen.getAllByRole('radio');
			radioButtons.forEach((radio) => {
				expect(radio).toBeDisabled();
			});

			const bookmarkButton = screen.getByRole('button', { name: /mark for review/i });
			expect(bookmarkButton).toBeDisabled();
		});

		it('should not allow answer changes when question is locked', async () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 10,
					correct_answer: [mockSingleChoiceQuestion.options[1].id],
					is_reviewed: true,
					bookmarked: false
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

			const labels = screen.getAllByText(/[A-D]\./);
			await labels[2].click();

			expect(fetch).not.toHaveBeenCalled();
		});

		it('should not show feedback button when showFeedback is false', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 10,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions,
					showFeedback: false
				}
			});

			expect(screen.queryByRole('button', { name: /view Result/i })).not.toBeInTheDocument();
		});

		it('should not show feedback button for answered subjective question', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockSubjectiveQuestion.id,
					response: 'This is my subjective answer',
					visited: true,
					time_spent: 30,
					bookmarked: false,
					is_reviewed: false
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

			expect(screen.queryByRole('button', { name: /view Result/i })).not.toBeInTheDocument();
		});
	});

	describe('Numerical integer question functionality', () => {
		it('should render input field for numerical-integer questions', () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByPlaceholderText(/type your answer here/i)).toBeInTheDocument();
			// input, not textarea
			expect(screen.getByPlaceholderText(/type your answer here/i).tagName).toBe('INPUT');
		});

		it('should not render radio buttons or checkboxes for numerical-integer questions', () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});

		it('should render Save Answer button for numerical-integer questions', () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
		});

		it('should disable Save Answer button when input is empty', () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('should disable Save Answer button when only whitespace is entered', async () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const input = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(input, { target: { value: '   ' } });

			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('should enable Save Answer button when a value is entered', async () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const input = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(input, { target: { value: '8' } });

			expect(screen.getByRole('button', { name: /save answer/i })).not.toBeDisabled();
		});

		it('should display existing answer when previously answered', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 20,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			const input = screen.getByPlaceholderText(/type your answer here/i);
			expect(input).toHaveValue('8');
		});

		it('should show Saved state when question was previously answered without changes', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 20,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /saved/i })).toBeDisabled();
		});

		it('should show Update Answer button when modifying a previously saved answer', async () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 20,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			const input = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(input, { target: { value: '42' } });

			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
		});

		it('should call API when Save Answer is clicked with entered value', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({ success: true }) as unknown as Response
			);

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const input = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(input, { target: { value: '8' } });

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			await saveButton.click();

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/submit-answer'),
					expect.objectContaining({
						method: 'POST',
						body: expect.stringContaining('"8"')
					})
				);
			});
		});

		it('should show error message when save fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const input = screen.getByPlaceholderText(/type your answer here/i);
			await fireEvent.input(input, { target: { value: '8' } });

			const saveButton = screen.getByRole('button', { name: /save answer/i });
			await saveButton.click();

			await waitFor(() => {
				expect(screen.getByText(/failed to save your answer/i)).toBeInTheDocument();
			});
		});

		it('should show View Result button for answered numerical-integer question when showFeedback is true', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 20,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions,
					showFeedback: true
				}
			});

			expect(screen.getByRole('button', { name: /view result/i })).toBeInTheDocument();
		});

		it('should not show View Result button for unanswered numerical-integer question', () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [],
					showFeedback: true
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});

		it('should show Not Attempted when locked with no response', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '',
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: true
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByText(/not attempted/i)).toBeInTheDocument();
		});

		it('should show Correct feedback when integer answer exactly matches correct answer', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 8 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByText('Correct')).toBeInTheDocument();
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
		});

		it('should show Wrong feedback when integer answer does not match correct answer', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '5',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 8 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByText('Wrong')).toBeInTheDocument();
		});

		it('should display the correct answer when integer answer is wrong', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '5',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 8 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			// The correct answer value should be displayed in the feedback panel
			expect(screen.getByText('8')).toBeInTheDocument();
		});

		it('should lock the input and hide Save button when is_reviewed is true', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 8 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.queryByPlaceholderText(/type your answer here/i)).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /save answer/i })).not.toBeInTheDocument();
		});

		describe('correct answer is zero (integer)', () => {
			it('should show Correct when submitted answer is 0 and correct answer is 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalIntegerQuestion.id,
						response: '0',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalIntegerQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				expect(screen.getByText('Correct')).toBeInTheDocument();
				expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
			});

			it('should show Wrong when submitted answer is non-zero and correct answer is 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalIntegerQuestion.id,
						response: '5',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalIntegerQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				expect(screen.getByText('Wrong')).toBeInTheDocument();
			});

			it('should display "0" as the correct answer when response is wrong and correct answer is 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalIntegerQuestion.id,
						response: '5',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalIntegerQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				// '0' should appear as the correct answer in the feedback panel
				expect(screen.getByText('0')).toBeInTheDocument();
			});
		});
	});

	describe('Numerical decimal question functionality', () => {
		it('should render input field for numerical-decimal questions', () => {
			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(screen.getByPlaceholderText(/type your answer here/i)).toBeInTheDocument();
			expect(screen.getByPlaceholderText(/type your answer here/i).tagName).toBe('INPUT');
		});

		it('should show Correct feedback when decimal answer is within 0.05 tolerance', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalDecimalQuestion.id,
					response: '3.16',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 3.14 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			// |3.16 - 3.14| = 0.02 <= 0.05, so correct
			expect(screen.getByText('Correct')).toBeInTheDocument();
			expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
		});

		it('should show Wrong feedback when decimal answer is outside 0.05 tolerance', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalDecimalQuestion.id,
					response: '2.5',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 3.14 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			// |2.5 - 3.14| = 0.64 > 0.05, so wrong
			expect(screen.getByText('Wrong')).toBeInTheDocument();
		});

		it('should show Correct feedback when decimal answer exactly matches correct answer', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalDecimalQuestion.id,
					response: '3.14',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 3.14 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByText('Correct')).toBeInTheDocument();
		});

		it('should show Not Attempted when locked with no decimal response', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalDecimalQuestion.id,
					response: '',
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: true
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByText(/not attempted/i)).toBeInTheDocument();
		});

		it('should display the correct answer when decimal response is wrong', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalDecimalQuestion.id,
					response: '2.5',
					visited: true,
					time_spent: 15,
					bookmarked: false,
					is_reviewed: true,
					correct_answer: 3.14 as any
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			expect(screen.getByText('3.14')).toBeInTheDocument();
		});

		it('should show View Result button for answered numerical-decimal question when showFeedback is true', () => {
			const selectedQuestions = [
				{
					question_revision_id: mockNumericalDecimalQuestion.id,
					response: '3.14',
					visited: true,
					time_spent: 10,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions,
					showFeedback: true
				}
			});

			expect(screen.getByRole('button', { name: /view result/i })).toBeInTheDocument();
		});

		describe('correct answer is zero (decimal)', () => {
			it('should show Correct when submitted answer is 0 and correct answer is 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalDecimalQuestion.id,
						response: '0',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalDecimalQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				// |0 - 0| = 0 <= 0.5
				expect(screen.getByText('Correct')).toBeInTheDocument();
				expect(screen.queryByText('Wrong')).not.toBeInTheDocument();
			});

			it('should show Correct when decimal answer is within 0.05 tolerance of 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalDecimalQuestion.id,
						response: '0.03',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalDecimalQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				// |0.03 - 0| = 0.03 <= 0.05
				expect(screen.getByText('Correct')).toBeInTheDocument();
			});

			it('should show Wrong when decimal answer is outside 0.05 tolerance of 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalDecimalQuestion.id,
						response: '0.6',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalDecimalQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				// |0.6 - 0| = 0.6 > 0.05
				expect(screen.getByText('Wrong')).toBeInTheDocument();
			});

			it('should display "0" as the correct answer when decimal response is wrong and correct answer is 0', () => {
				const selectedQuestions = [
					{
						question_revision_id: mockNumericalDecimalQuestion.id,
						response: '0.6',
						visited: true,
						time_spent: 10,
						bookmarked: false,
						is_reviewed: true,
						correct_answer: 0 as any
					}
				];

				render(QuestionCard, {
					props: {
						question: mockNumericalDecimalQuestion,
						serialNumber: 1,
						candidate: mockCandidate,
						totalQuestions: 10,
						selectedQuestions
					}
				});

				expect(screen.getByText('0')).toBeInTheDocument();
			});
		});
	});
	describe('View Feedback button controlled by showFeedback prop', () => {
		const answeredSingleChoice = [
			{
				question_revision_id: mockSingleChoiceQuestion.id,
				response: [mockSingleChoiceQuestion.options[0].id],
				visited: true,
				time_spent: 10,
				bookmarked: false,
				is_reviewed: false
			}
		];

		const answeredMultipleChoice = [
			{
				question_revision_id: mockMultipleChoiceQuestion.id,
				response: [mockMultipleChoiceQuestion.options[0].id],
				visited: true,
				time_spent: 10,
				bookmarked: false,
				is_reviewed: false
			}
		];

		it('shows the button for single-choice when showFeedback is true and question is answered', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: answeredSingleChoice,
					showFeedback: true
				}
			});

			expect(screen.getByRole('button', { name: /view result/i })).toBeInTheDocument();
		});

		it('hides the button for single-choice when showFeedback is false', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: answeredSingleChoice,
					showFeedback: false
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});

		it('hides the button when showFeedback is not passed (defaults to false)', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: answeredSingleChoice
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});

		it('shows the button for multiple-choice when showFeedback is true and question is answered', () => {
			render(QuestionCard, {
				props: {
					question: mockMultipleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: answeredMultipleChoice,
					showFeedback: true
				}
			});

			expect(screen.getByRole('button', { name: /view result/i })).toBeInTheDocument();
		});

		it('hides the button for multiple-choice when showFeedback is false', () => {
			render(QuestionCard, {
				props: {
					question: mockMultipleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: answeredMultipleChoice,
					showFeedback: false
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});

		it('hides the button for subjective regardless of showFeedback', () => {
			render(QuestionCard, {
				props: {
					question: mockSubjectiveQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [
						{
							question_revision_id: mockSubjectiveQuestion.id,
							response: 'My answer',
							visited: true,
							time_spent: 10,
							bookmarked: false,
							is_reviewed: false
						}
					],
					showFeedback: true
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});

		it('hides the button when question is unanswered even if showFeedback is true', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [],
					showFeedback: true
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});

		it('hides the button after feedback is viewed (is_reviewed=true) even if showFeedback is true', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [
						{
							question_revision_id: mockSingleChoiceQuestion.id,
							response: [mockSingleChoiceQuestion.options[0].id],
							visited: true,
							time_spent: 10,
							bookmarked: false,
							is_reviewed: true
						}
					],
					showFeedback: true
				}
			});

			expect(screen.queryByRole('button', { name: /view result/i })).not.toBeInTheDocument();
		});
	});
});
