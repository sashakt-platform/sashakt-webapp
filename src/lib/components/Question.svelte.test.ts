import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import Question from './Question.svelte';
import {
	mockCandidate,
	mockQuestions,
	mockSectionedTestQuestionsResponse,
	mockTestData,
	setLocaleForTests
} from '$lib/test-utils';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: {
		form: null
	}
}));

vi.mock('$lib/helpers/formErrorHandler', () => ({
	createFormEnhanceHandler: vi.fn(() => vi.fn())
}));

import { page } from '$app/state';
import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
type MockPageForm = { submitTest?: boolean; error?: string; result?: boolean } | null;
const mockPage = page as { form: MockPageForm };

// Mock fetch for API calls
vi.stubGlobal('fetch', vi.fn());

const testQuestions = {
	question_revisions: mockQuestions,
	question_pagination: 2
};

const testDetails = mockTestData;

describe('Question', () => {
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
			const submitButtons = screen.getAllByRole('button', { name: /submit test/i });
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
			// Each question shows a Q-badge like "Q1", "Q2", etc.
			const badge = screen.getAllByText(/^Q\d+$/);
			expect(badge.length).toBeGreaterThan(0);
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

	describe('bottom navigation bar', () => {
		it('should show page info text', async () => {
			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions,
					testDetails
				}
			});

			await vi.waitFor(() => {
				expect(screen.getByText(/page/i)).toBeInTheDocument();
				expect(screen.getByText(/questions/i)).toBeInTheDocument();
			});
		});

		it('should show "Submit Test" label (not plain "Submit") on last page', async () => {
			const singlePageQuestions = {
				question_revisions: [mockQuestions[0]],
				question_pagination: 10
			};

			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions: singlePageQuestions,
					testDetails
				}
			});

			await vi.waitFor(() => {
				expect(screen.getByText(/submit test/i)).toBeInTheDocument();
			});
		});

		it('should show "Next" button when not on last page', async () => {
			const paginatedQuestions = {
				question_revisions: mockQuestions,
				question_pagination: 1
			};

			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions: paginatedQuestions,
					testDetails
				}
			});

			await vi.waitFor(() => {
				expect(screen.getByText(/next/i)).toBeInTheDocument();
				expect(screen.queryByText(/submit test/i)).not.toBeInTheDocument();
			});
		});

		it('should render bottom bar with fixed positioning class', async () => {
			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions,
					testDetails
				}
			});

			await vi.waitFor(() => {
				const nav = document.querySelector('ul.fixed');
				expect(nav).toBeInTheDocument();
			});
		});

		it('should show page info in Hindi', async () => {
			await setLocaleForTests('hi-IN');
			render(Question, {
				props: {
					candidate: mockCandidate,
					testQuestions,
					testDetails
				}
			});

			await vi.waitFor(() => {
				expect(screen.getAllByText(/पृष्ठ/i).length).toBeGreaterThan(0);
				expect(screen.getAllByText(/प्रश्न/i).length).toBeGreaterThan(0);
			});
		});
	});

	describe('submit dialog error states', () => {
		const errorTestQuestions = {
			question_revisions: [mockQuestions[2]],
			question_pagination: 1
		};

		afterEach(() => {
			mockPage.form = null;
		});

		it('shows "Submission Failed" title when page.form.error is set', async () => {
			mockPage.form = { submitTest: false, error: 'Server error occurred' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(screen.getByText(/Submission Failed/i)).toBeInTheDocument();
			});
		});

		it('shows the specific error message from page.form.error', async () => {
			mockPage.form = { submitTest: false, error: 'Payment gateway timeout' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(screen.getByText('Payment gateway timeout')).toBeInTheDocument();
				expect(screen.getByText(/Please click Submit again to retry/i)).toBeInTheDocument();
			});
		});

		it('shows generic error message when submitTest is false with no specific error', async () => {
			mockPage.form = { submitTest: false, result: false };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(
					screen.getByText(/There was an issue with your previous submission/i)
				).toBeInTheDocument();
				expect(screen.getByText(/Please click Submit again to retry/i)).toBeInTheDocument();
			});
		});

		it('shows error dialog with Cancel button still functional', async () => {
			mockPage.form = { submitTest: false, error: 'Some error' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(screen.getByText(/Submission Failed/i)).toBeInTheDocument();
			});

			expect(screen.getAllByRole('button', { name: /cancel/i }).length).toBeGreaterThan(0);
		});
	});

	describe('submit dialog loading state (isSubmittingTest)', () => {
		const loadingTestQuestions = {
			question_revisions: [mockQuestions[2]],
			question_pagination: 1
		};

		let capturedSetLoading: ((v: boolean) => void) | undefined;

		beforeEach(() => {
			capturedSetLoading = undefined;
			vi.mocked(createFormEnhanceHandler).mockImplementation((opts) => {
				capturedSetLoading = opts.setLoading;
				return vi.fn();
			});
		});

		afterEach(() => {
			mockPage.form = null;
		});

		it('shows Spinner in submit button when isSubmittingTest is true', async () => {
			mockPage.form = { submitTest: false, error: 'previous error' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: loadingTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(screen.getByText(/Submission Failed/i)).toBeInTheDocument();
			});

			capturedSetLoading?.(true);

			await waitFor(() => {
				expect(screen.getByRole('status')).toBeInTheDocument();
			});
		});

		it('disables Cancel button while loading', async () => {
			mockPage.form = { submitTest: false, error: 'previous error' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: loadingTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(screen.getByText(/Submission Failed/i)).toBeInTheDocument();
			});

			capturedSetLoading?.(true);

			await waitFor(() => {
				const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
				expect(cancelButtons.some((btn) => btn.hasAttribute('disabled'))).toBe(true);
			});
		});

		it('disables Submit button while loading', async () => {
			mockPage.form = { submitTest: false, error: 'previous error' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: loadingTestQuestions, testDetails }
			});

			await waitFor(() => {
				expect(screen.getByText(/Submission Failed/i)).toBeInTheDocument();
			});

			capturedSetLoading?.(true);

			await waitFor(() => {
				const submitButtons = screen.getAllByRole('button', { name: /submit/i });
				expect(submitButtons.some((btn) => btn.hasAttribute('disabled'))).toBe(true);
			});
		});
	});

	describe('submit dialog client-side error (submitError)', () => {
		const errorTestQuestions = {
			question_revisions: [mockQuestions[2]],
			question_pagination: 1
		};

		let capturedSetError: ((v: string | null) => void) | undefined;

		beforeEach(() => {
			capturedSetError = undefined;
			vi.mocked(createFormEnhanceHandler).mockImplementation((opts) => {
				capturedSetError = opts.setError;
				return vi.fn();
			});
		});

		afterEach(() => {
			mockPage.form = null;
		});

		it('shows "Submission Failed" title when submitError is set', async () => {
			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			capturedSetError?.('Network connection failed');

			await waitFor(() => {
				expect(screen.getByText(/Submission Failed/i)).toBeInTheDocument();
			});
		});

		it('shows the submitError message in the dialog body', async () => {
			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			capturedSetError?.('Network connection failed');

			await waitFor(() => {
				expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
				expect(screen.getByText(/Please click Submit again to retry/i)).toBeInTheDocument();
			});
		});

		it('takes priority over page.form.error when both are set', async () => {
			mockPage.form = { submitTest: false, error: 'Server error' };

			render(Question, {
				props: { candidate: mockCandidate, testQuestions: errorTestQuestions, testDetails }
			});

			capturedSetError?.('Client network error');

			await waitFor(() => {
				expect(screen.getByText(/Client network error/i)).toBeInTheDocument();
			});
		});
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

			expect(screen.getAllByText('Marks:').length).toBeGreaterThan(0);
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

			expect(screen.queryAllByText('Marks:')).toHaveLength(0);
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

			expect(screen.getAllByText('Marks:').length).toBeGreaterThan(0);
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
			expect(screen.getByText(/परीक्षा जमा करें/i)).toBeInTheDocument();
		});

		const submitElement = screen.getByText(/परीक्षा जमा करें/i);
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
				screen.getAllByText(/परीक्षा जमा करने के बाद कोई बदलाव अनुमत नहीं होगा।/i).length
			).toBeGreaterThan(0);
			expect(screen.getAllByText(/जमा करें/i).length).toBeGreaterThan(0);
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
			expect(screen.getByText(/Submit Test\?/)).toBeInTheDocument();
			expect(
				screen.getAllByText(
					/No changes will be allowed once you submit the test\. Are you sure you want to submit\?/i
				).length
			).toBeGreaterThan(0);
			expect(screen.getByText(/^Submit$/i)).toBeInTheDocument();
			expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
		});
	});
});
