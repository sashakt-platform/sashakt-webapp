import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import Question from './Question.svelte';
import { mockCandidate, mockQuestions, setLocaleForTests } from '$lib/test-utils';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: {
		form: null
	}
}));

// Mock fetch for API calls
vi.stubGlobal('fetch', vi.fn());

const testQuestions = {
	question_revisions: mockQuestions,
	question_pagination: 2
};

describe('Question', () => {
	it('should render questions', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions
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
				testQuestions
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
				testQuestions: singlePageQuestions
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
				testQuestions
			}
		});

		await vi.waitFor(() => {
			// First question should show "1"
			expect(screen.getByText('1')).toBeInTheDocument();
		});
	});

	it('should show total question count', async () => {
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions
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
				testQuestions: paginatedQuestions
			}
		});

		await vi.waitFor(() => {
			// Should only show first question on first page
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});

		// Second question should not be visible on first page
		expect(screen.queryByText(mockQuestions[1].question_text)).not.toBeInTheDocument();
	});

	it('should handle questions without pagination', async () => {
		const noPaginationQuestions = {
			question_revisions: mockQuestions,
			question_pagination: null // All questions on one page
		};

		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions: noPaginationQuestions
			}
		});

		await vi.waitFor(() => {
			// All questions should be visible
			mockQuestions.forEach((q) => {
				expect(screen.getByText(q.question_text)).toBeInTheDocument();
			});
		});
	});
});

describe('Support for Localization', () => {
	it('displays text in Hindi Language', async () => {
		await setLocaleForTests('hi-IN');
		render(Question, {
			props: {
				candidate: mockCandidate,
				testQuestions
			}
		});

		await waitFor(async () => {
			const elements = screen.getAllByText(/अंक/i);
			expect(elements.length).toBeGreaterThanOrEqual(2);

			const nextElements = screen.getAllByText(/अगला/i);
			expect(nextElements[0]).toBeInTheDocument();
			const previousElements = screen.getAllByText(/पिछला/i);
			expect(previousElements[0]).toBeInTheDocument();

			await fireEvent.click(nextElements[0]);

			expect(screen.getByText(/सभी अनिवार्य प्रश्नों का उत्तर दें!/)).toBeInTheDocument();
			expect(
				screen.getByText(
					/कृपया सुनिश्चित करें कि सभी अनिवार्य प्रश्नों का उत्तर दिया गया है अगले पृष्ठ पर जाने से पहले./
				)
			).toBeInTheDocument();
			expect(screen.getByText(/ठीक है/)).toBeInTheDocument();
		});
	});
});
