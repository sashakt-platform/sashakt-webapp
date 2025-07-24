import LandingPage from '$lib/components/LandingPage.svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock $app/forms
vi.mock('$app/forms', () => ({
	enhance: vi.fn()
}));

// Mock $app/state
// Step 1: Define a mutable value to simulate store state
let mockPageData = {
	data: {
		timeToBegin: 0
	}
};

// Step 2: Mock $app/state using subscribe pattern
vi.mock('$app/state', () => ({
	page: {
		subscribe: (fn: any) => {
			fn(mockPageData);
			return () => {};
		}
	}
}));

vi.mock('$lib/components/PreTestTimer.svelte', () => ({
	default: (props: any) => ({
		$$render: () => `<div>Timer: ${props.timeLeft}</div>`
	})
}));

// Sample testDetails
const testDetails = {
	name: 'Sample Test',
	total_questions: 10,
	marks: 50,
	time_limit: 30,
	question_pagination: 2
};

describe('LandingPage', () => {
	it('should render test name and overview', () => {
		render(LandingPage, {
			props: {
				testDetails: { ...testDetails, start_instructions: 'Follow the instructions carefully.' }
			}
		});

		expect(screen.getByText(testDetails.name)).toBeInTheDocument();
		expect(screen.getByText('Total questions')).toBeInTheDocument();
		expect(screen.getByText('10 questions')).toBeInTheDocument();
		expect(screen.getByText('50 marks')).toBeInTheDocument();
		expect(screen.getByText('30 minutes')).toBeInTheDocument();
		expect(screen.getByText('2 question(s)')).toBeInTheDocument();
		expect(screen.getByText('Follow the instructions carefully.')).toBeInTheDocument();
	});

	it('should not display start instructions if not provided', () => {
		render(LandingPage, { props: { testDetails } });

		expect(screen.queryByText('Follow the instructions carefully.')).not.toBeInTheDocument();
	});

	it('should toggle start button enable state with checkbox (when timeToBegin is 0)', async () => {
		render(LandingPage, { props: { testDetails } });

		const checkbox = screen.getByLabelText(/have read and understood the instructions/i);
		const startButton = screen.getByRole('button', { name: /start/i });

		expect(startButton).toBeDisabled();

		await fireEvent.click(checkbox);
		expect(startButton).not.toBeDisabled();
	});
});
