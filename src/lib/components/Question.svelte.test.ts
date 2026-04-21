import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import Question from './Question.svelte';
import {
	mockCandidate,
	mockQuestions,
	mockSectionedTestQuestionsResponse,
	mockTestData,
	setLocaleForTests,
	createMockResponse,
	mockSubjectiveQuestion,
	mockSingleChoiceQuestion,
	mockOptionalQuestion
} from '$lib/test-utils';
import { createTestSessionStore } from '$lib/helpers/testSession';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: {
		form: null
	}
}));

vi.mock('$lib/helpers/testSession', () => ({
	createTestSessionStore: vi.fn(() => ({
		current: {
			candidate: mockCandidate,
			selections: [],
			currentPage: 1
		}
	}))
}));

// Mock fetch for API calls
vi.stubGlobal('fetch', vi.fn());

const testQuestions = {
	question_revisions: mockQuestions,
	question_pagination: 2
};

const testDetails = mockTestData;

describe('Question', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createTestSessionStore).mockReturnValue({
			current: {
				candidate: mockCandidate,
				selections: [],
				currentPage: 1
			}
		} as any);
	});

	it('should render questions', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions,
				testDetails
			}
		});

		// Wait for pagination to be ready (setTimeout in component)
		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});
	});

	it('should render pagination controls', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions,
				testDetails
			}
		});

		await vi.waitFor(() => {
			// Should have navigation buttons
			expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
		});
	});

	it('should render submit button on last page', async () => {
		const singlePageQuestions = {
			question_revisions: [mockQuestions[0]],
			question_pagination: 10 // All on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: singlePageQuestions,
				testDetails
			}
		});

		await vi.waitFor(() => {
			// Use getAllByRole since there might be multiple submit buttons (in dialog)
			const submitButtons = screen.getAllByRole('button', { name: /submit/i });
			expect(submitButtons.length).toBeGreaterThan(0);
		});
	});

	it('should display question serial numbers', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions,
				testDetails
			}
		});

		await vi.waitFor(() => {
			// first question should show "1" (may have multiple due to question palette)
			const ones = screen.getAllByText('1');
			expect(ones.length).toBeGreaterThan(0);
		});
	});

	it('should show total question count', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions,
				testDetails
			}
		});

		await vi.waitFor(() => {
			// Multiple questions may show "OF X", so use getAllByText
			const totalTexts = screen.getAllByText(`OF ${mockQuestions.length}`);
			expect(totalTexts.length).toBeGreaterThan(0);
		});
	});

	it('should render questions based on pagination', async () => {
		const paginatedQuestions = {
			question_revisions: mockQuestions,
			question_pagination: 1 // One question per page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: paginatedQuestions,
				testDetails
			}
		});

		await vi.waitFor(() => {
			// Should only show first question on first page
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});

		// Second question should not be visible on first page
		expect(screen.queryByText(mockQuestions[1].question_text)).not.toBeInTheDocument();
	});

	it('should render sectioned payloads in the existing flat question flow', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: { ...mockSectionedTestQuestionsResponse, question_pagination: 2 },
				testDetails
			}
		});

		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
			expect(screen.getByText(mockQuestions[1].question_text)).toBeInTheDocument();
		});
	});

	it('should handle questions without pagination', async () => {
		const noPaginationQuestions = {
			question_revisions: mockQuestions,
			question_pagination: null // All questions on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: noPaginationQuestions,
				testDetails
			}
		});

		await vi.waitFor(() => {
			// All questions should be visible
			mockQuestions.forEach((q) => {
				expect(screen.getByText(q.question_text)).toBeInTheDocument();
			});
		});
	});

	it('does not sync question time on page change when multiple questions share a page', async () => {
		vi.mocked(fetch).mockResolvedValue(createMockResponse({ success: true }) as unknown as Response);

		const multiQuestionPage = {
			question_revisions: [
				{ ...mockSubjectiveQuestion, is_mandatory: false },
				{ ...mockSingleChoiceQuestion, is_mandatory: false },
				{ ...mockOptionalQuestion, id: 99, is_mandatory: false }
			],
			question_pagination: 2
		};

		vi.mocked(createTestSessionStore).mockReturnValue({
			current: {
				candidate: mockCandidate,
				selections: [
					{
						question_revision_id: mockSubjectiveQuestion.id,
						response: 'saved answer',
						visited: true,
						time_spent: 7,
						bookmarked: false,
						is_reviewed: false
					}
				],
				currentPage: 1
			}
		} as any);

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: multiQuestionPage,
				testDetails
			}
		});

		await waitFor(() => {
			expect(screen.getByText(multiQuestionPage.question_revisions[0].question_text)).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: /next/i }));

		await waitFor(() => {
			expect(screen.getByText(multiQuestionPage.question_revisions[2].question_text)).toBeInTheDocument();
		});

		expect(fetch).not.toHaveBeenCalled();
	});

	describe('show_marks in testDetails', () => {
		it('should display marks when testDetails.show_marks is true', async () => {
			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions,
					testDetails: { ...testDetails, show_marks: true }
				}
			});

			await vi.waitFor(() => {
				expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
			});

			expect(screen.getAllByText(/\d+ Marks?/).length).toBeGreaterThan(0);
		});

		it('should hide marks when testDetails.show_marks is false', async () => {
			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions,
					testDetails: { ...testDetails, show_marks: false }
				}
			});

			await vi.waitFor(() => {
				expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
			});

			expect(screen.queryAllByText(/\d+ Marks?/)).toHaveLength(0);
		});

		it('should display marks by default when testDetails.show_marks is undefined', async () => {
			const testDetailsWithoutShowMarks = testDetails as typeof testDetails & {
				show_marks?: boolean;
			};

			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions,
					testDetails: testDetailsWithoutShowMarks
				}
			});

			await vi.waitFor(() => {
				expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
			});

			expect(screen.getAllByText(/\d+ Marks?/).length).toBeGreaterThan(0);
		});
	});
});

describe('Support for Localization', () => {
	it('displays text in Hindi Language in question page', async () => {
		await setLocaleForTests('hi-IN');
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions,
				testDetails
			}
		});

		await waitFor(() => {
			const elements = screen.getAllByText(/अंक/i);
			expect(elements.length).toBeGreaterThanOrEqual(2);
		});

		const nextElements = screen.getByText(/अगला/i);
		expect(nextElements).toBeInTheDocument();
		const previousElements = screen.getByText(/पिछला/i);
		expect(previousElements).toBeInTheDocument();

		await fireEvent.click(nextElements);

		await waitFor(() => {
			expect(screen.getByText(/सभी अनिवार्य प्रश्नों के उत्तर दें!/)).toBeInTheDocument();
			// expect(
			// 	screen.getByText(
			// 		/कृपया सुनिश्चित करें कि सभी अनिवार्य प्रश्नों के उत्तर दिए गए हैं। परीक्षा जमा करने से पहले./
			// 	)
			// ).toBeInTheDocument();
			expect(screen.getByText(/ठीक है/)).toBeInTheDocument();
		});
	});

	it('should display text in Hindi Language for submission page', async () => {
		await setLocaleForTests('hi-IN');
		const singlePageQuestions = {
			question_revisions: [mockQuestions[0]],
			question_pagination: 1 // All on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: singlePageQuestions,
				testDetails
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/जमा करें/i)).toBeInTheDocument();
		});

		const submitElement = screen.getByText(/जमा करें/i);
		await fireEvent.click(submitElement);

		await waitFor(() => {
			expect(screen.getByText(/सभी अनिवार्य प्रश्नों के उत्तर दें!/)).toBeInTheDocument();
			expect(
				screen.getByText(
					/कृपया सुनिश्चित करें कि सभी अनिवार्य प्रश्नों के उत्तर दिए गए हैं। परीक्षा जमा करने से पहले./
				)
			).toBeInTheDocument();
			expect(screen.getByText(/ठीक है/)).toBeInTheDocument();
		});
	});

	it('should display text in Hindi Language During Final Submission', async () => {
		await setLocaleForTests('hi-IN');
		const singlePageQuestions = {
			question_revisions: [mockQuestions[2]],
			question_pagination: 1 // All on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: singlePageQuestions,
				testDetails
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/जमा करें/i)).toBeInTheDocument();
		});

		const submitElement = screen.getByText(/जमा करें/i);
		await fireEvent.click(submitElement);

		await waitFor(() => {
			expect(screen.getByText(/परीक्षा जमा करें\?/)).toBeInTheDocument();
			expect(
				screen.getByText(
					/क्या आप वाकई अंतिम मूल्यांकन के लिए अपना शोध पत्र जमा करना चाहते हैं\? जमा करने के बाद कोई बदलाव स्वीकार्य नहीं होगा।/i
				)
			).toBeInTheDocument();
			expect(screen.getByText(/पुष्टि करें/i)).toBeInTheDocument();
			expect(screen.getByText(/रद्द करें/i)).toBeInTheDocument();
		});
	});

	it('displays text in English Language in question page', async () => {
		await setLocaleForTests('en-US');
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions,
				testDetails
			}
		});

		await waitFor(() => {
			const elements = screen.getAllByText(/Mark/i);
			expect(elements.length).toBeGreaterThanOrEqual(2);
		});

		const nextElements = screen.getByText(/next/i);
		expect(nextElements).toBeInTheDocument();
		const previousElements = screen.getByText(/previous/i);
		expect(previousElements).toBeInTheDocument();

		await fireEvent.click(nextElements);

		await waitFor(() => {
			expect(screen.getByText(/Answer all mandatory questions!/i)).toBeInTheDocument();
			expect(
				screen.getByText(
					/Please make sure all mandatory questions are answered before proceeding to the next page./
				)
			).toBeInTheDocument();
			expect(screen.getByText(/okay/i)).toBeInTheDocument();
		});
	});

	it('should display text in English Language for submission page', async () => {
		const singlePageQuestions = {
			question_revisions: [mockQuestions[0]],
			question_pagination: 1 // All on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: singlePageQuestions,
				testDetails
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/submit/i)).toBeInTheDocument();
		});

		const submitElement = screen.getByText(/submit/i);
		await fireEvent.click(submitElement);

		await waitFor(() => {
			expect(screen.getByText(/Answer all mandatory questions!/)).toBeInTheDocument();
			expect(
				screen.getByText(
					/Please make sure all mandatory questions are answered before submitting the test./
				)
			).toBeInTheDocument();
			expect(screen.getByText(/okay/i)).toBeInTheDocument();
		});
	});

	it('should display text in English Language During Final Submission', async () => {
		const singlePageQuestions = {
			question_revisions: [mockQuestions[2]],
			question_pagination: 1 // All on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: singlePageQuestions,
				testDetails
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/Submit/i)).toBeInTheDocument();
		});

		const submitElement = screen.getByText(/Submit/i);
		await fireEvent.click(submitElement);

		await waitFor(() => {
			expect(screen.getByText(/Submit test\?/)).toBeInTheDocument();
			expect(
				screen.getByText(
					/Are you sure you want to submit for final marking\? No changes will be allowed after submission./i
				)
			).toBeInTheDocument();
			expect(screen.getByText(/Confirm/i)).toBeInTheDocument();
			expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
		});
	});
});
