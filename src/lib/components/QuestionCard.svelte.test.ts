import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import QuestionCard from './QuestionCard.svelte';
import { fireEvent } from '@testing-library/svelte';
import type { TSelection } from '$lib/types';
import {
	mockCandidate,
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockMultiChoiceWithPartialMarks,
	mockSubjectiveQuestion,
	mockSubjectiveQuestionNoLimit,
	mockNumericalIntegerQuestion,
	mockNumericalDecimalQuestion,
	mockMatrixRatingQuestion,
	mockMatrixRatingOptions,
	mockMatrixMatchQuestion,
	mockMatrixInputTextQuestion,
	mockMatrixInputTextOptions,
	mockMatrixInputNumberQuestion,
	mockMatrixInputNumberOptions,
	mockQuestionWithMedia,
	mockImageMedia,
	mockYoutubeMedia,
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

	it('uses the local per-card timer when parent timing is not provided', async () => {
		vi.useFakeTimers();
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

		await vi.advanceTimersByTimeAsync(3000);
		await fireEvent.click(screen.getAllByRole('radio')[0]);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});

		const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
		expect(body.time_spent).toBeGreaterThanOrEqual(3);

		vi.useRealTimers();
	});

	it('uses parent-supplied timing when currentQuestionTimeSpent is provided', async () => {
		const onTimeSpentSynced = vi.fn();
		vi.mocked(fetch).mockResolvedValueOnce(
			createMockResponse({ success: true }) as unknown as Response
		);

		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: [],
				currentQuestionTimeSpent: 17,
				onTimeSpentSynced
			}
		});

		await fireEvent.click(screen.getAllByRole('radio')[0]);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});

		const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
		expect(body.time_spent).toBe(17);
		expect(onTimeSpentSynced).toHaveBeenCalledWith(17);
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

	describe('showMarkForReview prop', () => {
		it('should show "Mark for review" button by default when prop is not provided', () => {
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

		it('should show "Mark for review" button when showMarkForReview is true', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [],
					showMarkForReview: true
				}
			});

			expect(screen.getByRole('button', { name: /mark for review/i })).toBeInTheDocument();
		});

		it('should hide "Mark for review" button when showMarkForReview is false', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [],
					showMarkForReview: false
				}
			});

			expect(screen.queryByRole('button', { name: /mark for review/i })).not.toBeInTheDocument();
		});

		it('should hide "mark for review" button when showMarkForReview is false and question is bookmarked', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [
						{
							question_revision_id: mockSingleChoiceQuestion.id,
							response: [],
							visited: true,
							time_spent: 0,
							bookmarked: true,
							is_reviewed: false
						}
					],
					showMarkForReview: false
				}
			});

			expect(screen.queryByRole('button', { name: /mark for review/i })).not.toBeInTheDocument();
		});

		it('should not affect other card elements when showMarkForReview is false', () => {
			render(QuestionCard, {
				props: {
					question: mockSingleChoiceQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [],
					showMarkForReview: false
				}
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			mockSingleChoiceQuestion.options.forEach((option) => {
				expect(
					screen.getByText(new RegExp(`${option.key}\\. ${option.value}`))
				).toBeInTheDocument();
			});
		});
	});

	describe('showMarks prop', () => {
		const defaultProps = {
			serialNumber: 1,
			candidate: mockCandidate,
			totalQuestions: 10,
			selectedQuestions: []
		};

		it('should show marks by default when showMarks prop is not provided', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			expect(screen.getByText('1 Mark')).toBeInTheDocument();
		});

		it('should show marks when showMarks is true', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps, showMarks: true }
			});

			expect(screen.getByText('1 Mark')).toBeInTheDocument();
		});

		it('should hide marks when showMarks is false', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps, showMarks: false }
			});

			expect(screen.queryByText('1 Mark')).not.toBeInTheDocument();
		});

		it('should hide marking scheme tooltip when showMarks is false', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps, showMarks: false }
			});

			expect(screen.queryByText('Marking Scheme')).not.toBeInTheDocument();
		});

		it('should not affect other card elements when showMarks is false', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps, showMarks: false }
			});

			expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
			mockSingleChoiceQuestion.options.forEach((option) => {
				expect(
					screen.getByText(new RegExp(`${option.key}\\. ${option.value}`))
				).toBeInTheDocument();
			});
		});

		it('should hide plural marks when showMarks is false', () => {
			render(QuestionCard, {
				props: { question: mockMultipleChoiceQuestion, ...defaultProps, showMarks: false }
			});

			expect(screen.queryByText('2 Marks')).not.toBeInTheDocument();
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
			expect(input).toHaveValue(8);
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

			const feedback = screen.getByTestId('numerical-answer-feedback');
			expect(within(feedback).getByText('Correct')).toBeInTheDocument();
			expect(within(feedback).queryByText('Wrong')).not.toBeInTheDocument();
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

			expect(
				within(screen.getByTestId('numerical-answer-feedback')).getByText('Wrong')
			).toBeInTheDocument();
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

				const feedback = screen.getByTestId('numerical-answer-feedback');
				expect(within(feedback).getByText('Correct')).toBeInTheDocument();
				expect(within(feedback).queryByText('Wrong')).not.toBeInTheDocument();
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

				expect(
					within(screen.getByTestId('numerical-answer-feedback')).getByText('Wrong')
				).toBeInTheDocument();
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
				expect(
					within(screen.getByTestId('numerical-correct-answer')).getByText('0')
				).toBeInTheDocument();
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
			const feedback1 = screen.getByTestId('numerical-answer-feedback');
			expect(within(feedback1).getByText('Correct')).toBeInTheDocument();
			expect(within(feedback1).queryByText('Wrong')).not.toBeInTheDocument();
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
			expect(
				within(screen.getByTestId('numerical-answer-feedback')).getByText('Wrong')
			).toBeInTheDocument();
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

			expect(
				within(screen.getByTestId('numerical-answer-feedback')).getByText('Correct')
			).toBeInTheDocument();
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
				const feedback = screen.getByTestId('numerical-answer-feedback');
				expect(within(feedback).getByText('Correct')).toBeInTheDocument();
				expect(within(feedback).queryByText('Wrong')).not.toBeInTheDocument();
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
				expect(
					within(screen.getByTestId('numerical-answer-feedback')).getByText('Correct')
				).toBeInTheDocument();
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
				expect(
					within(screen.getByTestId('numerical-answer-feedback')).getByText('Wrong')
				).toBeInTheDocument();
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

				expect(
					within(screen.getByTestId('numerical-correct-answer')).getByText('0')
				).toBeInTheDocument();
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

		it('hides the button for matrix-rating regardless of showFeedback and answered state', () => {
			render(QuestionCard, {
				props: {
					question: mockMatrixRatingQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: [
						{
							question_revision_id: mockMatrixRatingQuestion.id,
							response: JSON.stringify({ '1': 1 }),
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
	});

	describe('Marking scheme tooltip', () => {
		const defaultProps = {
			serialNumber: 1,
			candidate: mockCandidate,
			totalQuestions: 10,
			selectedQuestions: []
		};

		it('should render an info icon next to the marks text', () => {
			const { container } = render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			const marksTrigger = container.querySelector('.cursor-help');
			expect(marksTrigger).toBeInTheDocument();
			expect(marksTrigger?.querySelector('svg')).toBeInTheDocument();
		});

		it('should render the tooltip with marking scheme heading', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			expect(screen.getByText('Marking Scheme')).toBeInTheDocument();
		});

		it('should display correct marks value with + prefix', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			expect(screen.getByText('+1')).toBeInTheDocument();
		});

		it('should display wrong marks value in red when negative', () => {
			const { container } = render(QuestionCard, {
				props: {
					question: {
						...mockSingleChoiceQuestion,
						marking_scheme: { correct: 1, wrong: -1, skipped: 0 }
					},
					...defaultProps
				}
			});

			const wrongValueSpan = container.querySelector('.text-red-600');
			expect(wrongValueSpan).toBeInTheDocument();
			expect(wrongValueSpan?.textContent).toBe('-1');
		});

		it('should not apply red styling to wrong marks when zero', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			const wrongRow = screen.getByText('Wrong').closest('div');
			expect(wrongRow?.querySelector('.text-red-600')).not.toBeInTheDocument();
		});

		it('should display skipped marks value', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			expect(screen.getByText('Skipped')).toBeInTheDocument();
		});

		it('should show partial marks section for multi-choice question with partial scheme', () => {
			render(QuestionCard, {
				props: { question: mockMultiChoiceWithPartialMarks, ...defaultProps }
			});

			expect(screen.getByText('Partial Marks')).toBeInTheDocument();
		});

		it('should not show partial marks section for single-choice question', () => {
			render(QuestionCard, {
				props: { question: mockSingleChoiceQuestion, ...defaultProps }
			});

			expect(screen.queryByText('Partial Marks')).not.toBeInTheDocument();
		});

		it('should not show partial marks section for multi-choice question without partial scheme', () => {
			const questionNoPartial = {
				...mockMultiChoiceWithPartialMarks,
				marking_scheme: { correct: 4, wrong: -1, skipped: 0 }
			};

			render(QuestionCard, {
				props: { question: questionNoPartial, ...defaultProps }
			});

			expect(screen.queryByText('Partial Marks')).not.toBeInTheDocument();
		});

		it('should display each partial mark rule with correct selected count and marks', () => {
			render(QuestionCard, {
				props: { question: mockMultiChoiceWithPartialMarks, ...defaultProps }
			});

			expect(screen.getByText(/1 correct selected/i)).toBeInTheDocument();
			expect(screen.getByText(/2 correct selected/i)).toBeInTheDocument();
			expect(screen.getByText('+1')).toBeInTheDocument();
			expect(screen.getByText('+2')).toBeInTheDocument();
		});

		it('should use plural "correct selected" label for counts greater than 1', () => {
			render(QuestionCard, {
				props: { question: mockMultiChoiceWithPartialMarks, ...defaultProps }
			});

			const pluralRule = screen.getByText(/2 correct selected/i);
			expect(pluralRule).toBeInTheDocument();
		});

		it('should show negative marks warning when wrong < 0 in partial marks section', () => {
			render(QuestionCard, {
				props: { question: mockMultiChoiceWithPartialMarks, ...defaultProps }
			});

			expect(
				screen.getByText(/Partial marks awarded if no wrong option is selected/i)
			).toBeInTheDocument();
		});
	});

	describe('Matrix Rating question', () => {
		const defaultProps = {
			serialNumber: 1,
			candidate: mockCandidate,
			totalQuestions: 10,
			selectedQuestions: [] as TSelection[]
		};

		it('should render question text', () => {
			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			expect(screen.getByText(mockMatrixRatingQuestion.question_text)).toBeInTheDocument();
		});

		it('should render the rows label as the first column header', () => {
			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			expect(screen.getByText(mockMatrixRatingOptions.rows.label)).toBeInTheDocument();
		});

		it('should render all column headers', () => {
			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			mockMatrixRatingOptions.columns.items.forEach((col) => {
				expect(screen.getByText(`${col.key} – ${col.value}`)).toBeInTheDocument();
			});
		});

		it('should render all row labels', () => {
			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			mockMatrixRatingOptions.rows.items.forEach((row) => {
				expect(screen.getByText(row.value)).toBeInTheDocument();
			});
		});

		it('should render one radio per cell (rows × columns)', () => {
			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			const radios = screen.getAllByRole('radio');
			expect(radios).toHaveLength(
				mockMatrixRatingOptions.rows.items.length * mockMatrixRatingOptions.columns.items.length
			);
		});

		it('should render all radios unchecked when no prior selection exists', () => {
			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			screen.getAllByRole('radio').forEach((radio) => {
				expect(radio).not.toBeChecked();
			});
		});

		it('should pre-check the saved radio for a previously answered row', () => {
			const selectedQuestions: TSelection[] = [
				{
					question_revision_id: mockMatrixRatingQuestion.id,
					response: JSON.stringify({ '1': 2 }),
					visited: true,
					time_spent: 10,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: {
					question: mockMatrixRatingQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions
				}
			});

			const row1Radios = screen
				.getAllByRole('radio')
				.filter(
					(r) =>
						(r as HTMLInputElement).name ===
						`matrix-${mockMatrixRatingQuestion.id}-row-${mockMatrixRatingOptions.rows.items[0].id}`
				);
			const checkedRadio = row1Radios.find((r) => (r as HTMLInputElement).checked);
			expect(checkedRadio).toBeDefined();
			expect((checkedRadio as HTMLInputElement).value).toBe('2');
		});

		it('should call the submit API with a JSON-encoded matrix response when a radio is changed', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({ success: true }) as unknown as Response
			);

			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			const firstRadio = screen
				.getAllByRole('radio')
				.find(
					(r) =>
						(r as HTMLInputElement).name ===
						`matrix-${mockMatrixRatingQuestion.id}-row-${mockMatrixRatingOptions.rows.items[0].id}`
				) as HTMLElement;

			await fireEvent.change(firstRadio);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/submit-answer'),
					expect.objectContaining({
						method: 'POST',
						body: expect.stringContaining(`"question_revision_id":${mockMatrixRatingQuestion.id}`)
					})
				);
			});
		});

		it('should show an error message when the API call fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(QuestionCard, {
				props: { question: mockMatrixRatingQuestion, ...defaultProps }
			});

			const firstRadio = screen
				.getAllByRole('radio')
				.find(
					(r) =>
						(r as HTMLInputElement).name ===
						`matrix-${mockMatrixRatingQuestion.id}-row-${mockMatrixRatingOptions.rows.items[0].id}`
				) as HTMLElement;

			await fireEvent.change(firstRadio);

			await waitFor(() => {
				expect(screen.getByText(/failed to save your answer/i)).toBeInTheDocument();
			});
		});

		it('should disable all radios when the question is locked (is_reviewed)', () => {
			const selectedQuestions: TSelection[] = [
				{
					question_revision_id: mockMatrixRatingQuestion.id,
					response: JSON.stringify({ '1': 1 }),
					visited: true,
					time_spent: 10,
					bookmarked: false,
					is_reviewed: true
				}
			];

			render(QuestionCard, {
				props: {
					question: mockMatrixRatingQuestion,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions,
					showFeedback: true
				}
			});

			screen.getAllByRole('radio').forEach((radio) => {
				expect(radio).toBeDisabled();
			});
		});
	});

	describe('MATRIXMATCH question type', () => {
		const defaultProps = {
			serialNumber: 1,
			candidate: mockCandidate,
			totalQuestions: 10,
			selectedQuestions: []
		};

		it('should render question text', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			expect(screen.getByText(mockMatrixMatchQuestion.question_text)).toBeInTheDocument();
		});

		it('should render row and column labels', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			expect(screen.getByText('Column A')).toBeInTheDocument();
			expect(screen.getByText('Column B')).toBeInTheDocument();
		});

		it('should render row values with keys', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			expect(screen.getByText('Apple')).toBeInTheDocument();
			expect(screen.getByText('Banana')).toBeInTheDocument();
		});

		it('should render column values with keys', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			expect(screen.getByText('Red fruit')).toBeInTheDocument();
			expect(screen.getByText('Yellow fruit')).toBeInTheDocument();
		});

		it('should render column keys as table headers', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			const headers = screen.getAllByRole('columnheader');
			const headerTexts = headers.map((h) => h.textContent?.trim()).filter(Boolean);
			expect(headerTexts).toContain('P');
			expect(headerTexts).toContain('Q');
		});

		it('should render row keys in the table body', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			const table = screen.getByRole('table');
			expect(within(table).getByText('A')).toBeInTheDocument();
			expect(within(table).getByText('B')).toBeInTheDocument();
		});

		it('should render rows × columns checkboxes', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(4);
		});

		it('should render all checkboxes unchecked by default', () => {
			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps }
			});

			const checkboxes = screen.getAllByRole('checkbox');
			checkboxes.forEach((cb) => {
				expect(cb).toHaveAttribute('aria-checked', 'false');
			});
		});

		it('should reflect existing selections as checked checkboxes', () => {
			const existingResponse = JSON.stringify({ 801: [901] });
			const selectedQuestions = [
				{
					question_revision_id: mockMatrixMatchQuestion.id,
					response: existingResponse,
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps, selectedQuestions }
			});

			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
			expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false');
		});

		it('should toggle off a checked checkbox when clicked again', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(createMockResponse({}) as unknown as Response);

			const existingResponse = JSON.stringify({ 801: [901] });
			const selectedQuestions = [
				{
					question_revision_id: mockMatrixMatchQuestion.id,
					response: existingResponse,
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			];

			render(QuestionCard, {
				props: { question: mockMatrixMatchQuestion, ...defaultProps, selectedQuestions }
			});

			const checkboxes = screen.getAllByRole('checkbox');

			await checkboxes[0].click();

			await waitFor(() => {
				expect(fetch).toHaveBeenCalled();
				const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
				const parsed = JSON.parse(body.response);

				expect(parsed['801']).toEqual([]);
			});
		});
	});

	describe('media support', () => {
		it('should render question-level media image', () => {
			render(QuestionCard, {
				props: {
					question: mockQuestionWithMedia,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			const images = screen.getAllByRole('img');
			const questionImage = images.find(
				(img) => img.getAttribute('src') === mockImageMedia.image!.url
			);
			expect(questionImage).toBeInTheDocument();
			expect(questionImage).toHaveAttribute('alt', mockImageMedia.image!.alt_text);
		});

		it('should render option-level media image', () => {
			render(QuestionCard, {
				props: {
					question: mockQuestionWithMedia,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			// Option A has image media - the question image and option A image are both the same mockImageMedia
			const images = screen.getAllByRole('img');
			// There should be at least 2 images (question-level + option A)
			expect(images.length).toBeGreaterThanOrEqual(2);
		});

		it('should render option-level YouTube embed', () => {
			const { container } = render(QuestionCard, {
				props: {
					question: mockQuestionWithMedia,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			// Option B has YouTube media
			const iframes = container.querySelectorAll('iframe');
			const youtubeIframe = Array.from(iframes).find(
				(iframe) => iframe.getAttribute('src') === mockYoutubeMedia.external_media!.embed_url
			);
			expect(youtubeIframe).toBeInTheDocument();
		});

		it('should not render media for options without media', () => {
			const questionNoMedia = {
				...mockSingleChoiceQuestion,
				media: null
			};

			const { container } = render(QuestionCard, {
				props: {
					question: questionNoMedia,
					serialNumber: 1,
					candidate: mockCandidate,
					totalQuestions: 10,
					selectedQuestions: []
				}
			});

			expect(container.querySelector('iframe')).not.toBeInTheDocument();
			expect(screen.queryByRole('img')).not.toBeInTheDocument();
		});
	});

	describe('Matrix Input question types', () => {
		const defaultProps = {
			serialNumber: 1,
			candidate: mockCandidate,
			totalQuestions: 10,
			selectedQuestions: [] as TSelection[]
		};

		describe('rendering', () => {
			it('should render question text', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				expect(screen.getByText(mockMatrixInputTextQuestion.question_text)).toBeInTheDocument();
			});

			it('should render rows label as first column header', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				expect(screen.getByText(mockMatrixInputTextOptions.rows.label)).toBeInTheDocument();
			});

			it('should render columns label as second column header', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				expect(screen.getByText(mockMatrixInputTextOptions.columns.label)).toBeInTheDocument();
			});

			it('should render each row key and value', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				mockMatrixInputTextOptions.rows.items.forEach((row) => {
					expect(screen.getByText(new RegExp(`${row.key}\\.`))).toBeInTheDocument();
					expect(screen.getByText(row.value)).toBeInTheDocument();
				});
			});

			it('should render one input per row', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				const inputs = screen.getAllByRole('textbox');
				expect(inputs).toHaveLength(mockMatrixInputTextOptions.rows.items.length);
			});

			it('should render text inputs when columns.input_type is text', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				screen.getAllByRole('textbox').forEach((input) => {
					expect(input).toHaveAttribute('type', 'text');
				});
			});

			it('should render number inputs when columns.input_type is number', () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const inputs = screen.getAllByRole('spinbutton');
				expect(inputs).toHaveLength(mockMatrixInputNumberOptions.rows.items.length);
				inputs.forEach((input) => expect(input).toHaveAttribute('type', 'number'));
			});

			it('should render all inputs empty when no prior response', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				screen.getAllByRole('textbox').forEach((input) => {
					expect(input).toHaveValue('');
				});
			});

			it('should pre-fill inputs from existing JSON response', () => {
				const selectedQuestions: TSelection[] = [
					{
						question_revision_id: mockMatrixInputTextQuestion.id,
						response: JSON.stringify({ '1': 'Paris', '2': 'Tokyo' }),
						visited: true,
						time_spent: 0,
						bookmarked: false,
						is_reviewed: false
					}
				];
				render(QuestionCard, {
					props: { question: mockMatrixInputTextQuestion, ...defaultProps, selectedQuestions }
				});
				const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
				expect(inputs[0].value).toBe('Paris');
				expect(inputs[1].value).toBe('Tokyo');
			});

			it('should show Save Answer button initially', () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
			});
		});

		describe('save interaction', () => {
			it('should call fetch with JSON-encoded row values on save', async () => {
				vi.mocked(fetch).mockResolvedValueOnce(
					createMockResponse({ success: true }) as unknown as Response
				);
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });

				const inputs = screen.getAllByRole('textbox');
				await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
				await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

				await waitFor(() => {
					expect(fetch).toHaveBeenCalledWith(
						expect.stringContaining('/api/submit-answer'),
						expect.objectContaining({ method: 'POST' })
					);
					const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
					const response = JSON.parse(body.response);
					expect(response['1']).toBe('Paris');
				});
			});

			it('should show Saved after a successful save with no pending changes', async () => {
				vi.mocked(fetch).mockResolvedValueOnce(
					createMockResponse({ success: true }) as unknown as Response
				);
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });

				const inputs = screen.getAllByRole('textbox');
				await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
				await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

				await waitFor(() => {
					expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
				});
			});

			it('should show Update Answer after save when new changes are made', async () => {
				vi.mocked(fetch).mockResolvedValueOnce(
					createMockResponse({ success: true }) as unknown as Response
				);
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });

				const inputs = screen.getAllByRole('textbox');
				await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
				await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument()
				);

				await fireEvent.input(inputs[0], { target: { value: 'Lyon' } });
				expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
			});

			it('should show error message when API call fails', async () => {
				vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });

				const inputs = screen.getAllByRole('textbox');
				await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
				await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

				await waitFor(() => {
					expect(screen.getByText(/failed to save your answer/i)).toBeInTheDocument();
				});
			});

			it('should keep input value after API failure', async () => {
				vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });

				const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
				await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
				await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

				await waitFor(() =>
					expect(screen.getByText(/failed to save your answer/i)).toBeInTheDocument()
				);
				expect(inputs[0].value).toBe('Paris');
			});
		});

		describe('locked state', () => {
			it('should disable all inputs when is_reviewed is true', () => {
				const selectedQuestions: TSelection[] = [
					{
						question_revision_id: mockMatrixInputTextQuestion.id,
						response: JSON.stringify({ '1': 'Paris' }),
						visited: true,
						time_spent: 0,
						bookmarked: false,
						is_reviewed: true
					}
				];
				render(QuestionCard, {
					props: { question: mockMatrixInputTextQuestion, ...defaultProps, selectedQuestions }
				});
				screen.getAllByRole('textbox').forEach((input) => {
					expect(input).toBeDisabled();
				});
			});
		});

		describe('number input key blocking', () => {
			it('typing text in number input should not change the value', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				await fireEvent.input(input, { target: { value: 'a' } });
				expect((input as HTMLInputElement).value).toBe('');
			});

			it('should allow digit keys in number inputs', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				const event = new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true });
				input.dispatchEvent(event);
				expect(event.defaultPrevented).toBe(false);
			});

			it('should allow Backspace in number inputs', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				const event = new KeyboardEvent('keydown', {
					key: 'Backspace',
					bubbles: true,
					cancelable: true
				});
				input.dispatchEvent(event);
				expect(event.defaultPrevented).toBe(false);
			});

			it('should allow minus sign in number inputs', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				const event = new KeyboardEvent('keydown', { key: '-', bubbles: true, cancelable: true });
				input.dispatchEvent(event);
				expect(event.defaultPrevented).toBe(false);
			});

			it('should allow Home and End in number inputs', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				for (const key of ['Home', 'End']) {
					const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
					input.dispatchEvent(event);
					expect(event.defaultPrevented).toBe(false);
				}
			});

			it('should allow ArrowUp and ArrowDown in number inputs', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				for (const key of ['ArrowUp', 'ArrowDown']) {
					const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
					input.dispatchEvent(event);
					expect(event.defaultPrevented).toBe(false);
				}
			});

			it('should allow Ctrl/Cmd shortcuts in number inputs', async () => {
				render(QuestionCard, {
					props: { question: mockMatrixInputNumberQuestion, ...defaultProps }
				});
				const input = screen.getAllByRole('spinbutton')[0];
				for (const modifier of ['ctrlKey', 'metaKey'] as const) {
					const event = new KeyboardEvent('keydown', {
						key: 'a',
						[modifier]: true,
						bubbles: true,
						cancelable: true
					});
					input.dispatchEvent(event);
					expect(event.defaultPrevented).toBe(false);
				}
			});

			it('should not block keys in text inputs', async () => {
				render(QuestionCard, { props: { question: mockMatrixInputTextQuestion, ...defaultProps } });
				const input = screen.getAllByRole('textbox')[0];
				const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
				input.dispatchEvent(event);
				expect(event.defaultPrevented).toBe(false);
			});
		});
	});
});
