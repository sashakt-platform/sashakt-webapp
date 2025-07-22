import Question from '$lib/components/Question.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';

// Mock the helper
vi.mock('$lib/helpers/testFunctionalities', () => ({
	answeredAllMandatory: vi.fn()
}));

// Mock props
const mockQuestions = Array.from({ length: 5 }, (_, i) => ({
	id: i + 1,
	question_text: `Question ${i + 1}`,
	mandatory: i % 2 === 0 // every other question is mandatory
}));

const testQuestions = {
	question_revisions: mockQuestions,
	question_pagination: 2
};

describe('Question Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders paginated questions', async () => {
		render(Question, {
			props: { testQuestions }
		});

		// Should render first 2 questions only (perPage = 2)
		expect(screen.getByText('Question 1')).toBeInTheDocument();
		expect(screen.getByText('Question 2')).toBeInTheDocument();
		expect(screen.queryByText('Question 3')).not.toBeInTheDocument();
	});

	it('navigates to the next page', async () => {
		render(Question, {
			props: { testQuestions }
		});

		const nextButton = screen.getByRole('button', { name: /next/i });
		await fireEvent.click(nextButton);

		// Should now see Question 3 and 4
		expect(await screen.findByText('Question 3')).toBeInTheDocument();
		expect(screen.getByText('Question 4')).toBeInTheDocument();
		expect(screen.queryByText('Question 1')).not.toBeInTheDocument();
	});

	it('shows submit button on the last page', async () => {
		render(Question, {
			props: {
				testQuestions
			}
		});

		// Go to page 2
		const nextButton1 = await screen.findByRole('button', { name: /next/i });
		await fireEvent.click(nextButton1);

		// Wait for next button again (check if there's another page)
		const nextButton2 = screen.queryByRole('button', { name: /next/i });
		if (nextButton2) {
			await fireEvent.click(nextButton2);
		}

		// Now, we should be on the last page and the submit button should appear
		const submitButton = await screen.findByText(/submit/i);
		expect(submitButton).toBeInTheDocument();
	});

	it('opens dialog and shows "all mandatory answered" content', async () => {
		const { answeredAllMandatory } = await import('$lib/helpers/testFunctionalities');
		(answeredAllMandatory as vi.Mock).mockReturnValue(true);

		render(Question, {
			props: { testQuestions }
		});

		// Navigate to last page
		const nextButton = screen.getByRole('button', { name: /next/i });
		await fireEvent.click(nextButton);
		await fireEvent.click(nextButton);

		// Open dialog
		const submitButton = await screen.findByText(/submit/i);
		await fireEvent.click(submitButton);

		// Should show confirmation content
		expect(await screen.findByText('Submit test?')).toBeInTheDocument();
		expect(screen.getByText(/Are you sure you want to submit/i)).toBeInTheDocument();
	});

	it('opens dialog and shows "mandatory not answered" message', async () => {
		const { answeredAllMandatory } = await import('$lib/helpers/testFunctionalities');
		(answeredAllMandatory as vi.Mock).mockReturnValue(false);

		render(Question, {
			props: { testQuestions }
		});

		// Navigate to last page
		const nextButton = screen.getByRole('button', { name: /next/i });
		await fireEvent.click(nextButton);
		await fireEvent.click(nextButton);

		// Open dialog
		const submitButton = await screen.findByText(/submit/i);
		await fireEvent.click(submitButton);

		// Should show warning content
		expect(await screen.findByText('Answer all mandatory questions!')).toBeInTheDocument();
	});
});
