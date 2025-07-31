import { page } from '$app/state';
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

// mock $app/state
vi.mock('$app/state', async () => {
	const original = await vi.importActual('$app/state');

	return {
		...original,
		page: {}
	};
});

vi.mock('$lib/components/PreTestTimer.svelte');

// Sample testDetails
const testDetails = {
	name: 'Sample Test',
	total_questions: 10,
	marks: 50,
	time_limit: 30,
	question_pagination: 2
};

const originalUserAgent = navigator.userAgent;

beforeAll(() => {
	Object.defineProperty(window.navigator, 'userAgent', {
		value: 'Mozilla/5.0 (TestDevice)',
		configurable: true
	});
});

afterAll(() => {
	Object.defineProperty(window.navigator, 'userAgent', {
		value: originalUserAgent,
		configurable: true
	});
});

describe('Landing Page', () => {
	it('should render test name and overview', () => {
		render(LandingPage, {
			testDetails: { ...testDetails, start_instructions: 'Follow the instructions carefully.' }
		});

		expect(screen.getByText(testDetails.name)).toBeInTheDocument();
		expect(screen.getByText('Total questions')).toBeInTheDocument();
		expect(screen.getByText('10 questions')).toBeInTheDocument();
		expect(screen.getByText('50 marks')).toBeInTheDocument();
		expect(screen.getByText('30 minutes')).toBeInTheDocument();
		expect(screen.getByText('2 question(s)')).toBeInTheDocument();
		expect(screen.getByText('Follow the instructions carefully.')).toBeInTheDocument();
	});

	it('should show "all questions" for pagination zero', () => {
		render(LandingPage, { testDetails: { ...testDetails, question_pagination: 0 } });

		expect(screen.getByText(/all question/i)).toBeInTheDocument();
	});

	it('should not display start instructions if not provided', () => {
		render(LandingPage, { props: { testDetails } });

		expect(screen.queryByText('Follow the instructions carefully.')).not.toBeInTheDocument();
	});

	it('should toggle start button enable state with checkbox', async () => {
		render(LandingPage, { props: { testDetails } });

		const checkbox = screen.getByLabelText(/have read and understood the instructions/i);
		const startButton = screen.getByRole('button', { name: /start/i });

		expect(startButton).toBeDisabled();

		await fireEvent.click(checkbox);
		expect(startButton).not.toBeDisabled();
	});

	it('should start test if timeToBegin is zero', async () => {
		page.data = { timeToBegin: 0 };

		render(LandingPage, { props: { testDetails } });

		expect(screen.getByTestId('start-test')).toBeInTheDocument();

		const checkbox = screen.getByLabelText(/have read and understood the instructions/i);
		const startButton = screen.getByRole('button', { name: /start/i });

		await fireEvent.click(checkbox);
		await fireEvent.submit(startButton);
	});

	it('should open countdown dialog if timeToBegin is greater than zero', async () => {
		page.data = { timeToBegin: 45 };

		render(LandingPage, { props: { testDetails } });

		expect(screen.getByTestId('open-dialog')).toBeInTheDocument();
	});

	it('should send device information using navigator.userAgent', async () => {
		page.data = { timeToBegin: 0 };
		render(LandingPage, { props: { testDetails } });

		const input = screen.getByTestId('deviceInfo');
		expect(input).toHaveValue(JSON.stringify('Mozilla/5.0 (TestDevice)'));
		expect(input).toHaveAttribute('hidden');
	});
});
