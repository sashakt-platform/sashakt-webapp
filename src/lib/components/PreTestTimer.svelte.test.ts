import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PreTestTimer from './PreTestTimer.svelte';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: {
		data: {
			testData: {
				start_time: new Date(Date.now() + 600000).toISOString(), // 10 mins in future
				candidate_profile: null
			}
		}
	}
}));

describe('PreTestTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should render "Test has not started" when time is more than 10 minutes', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 700 // More than 10 minutes
			}
		});

		expect(screen.getByText('Test has not started!')).toBeInTheDocument();
	});

	it('should render "Test will begin shortly" when time is less than 10 minutes', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 300 // 5 minutes
			}
		});

		expect(screen.getByText('Your test will begin shortly!')).toBeInTheDocument();
	});

	it('should display start date and time when more than 10 minutes', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 700
			}
		});

		expect(screen.getByText('Test will start on')).toBeInTheDocument();
	});

	it('should display countdown timer when less than 10 minutes', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 300 // 5 minutes = 05:00
			}
		});

		expect(screen.getByText('05:00')).toBeInTheDocument();
	});

	it('should display time in MM:SS format', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 125 // 2 minutes 5 seconds
			}
		});

		expect(screen.getByText('02:05')).toBeInTheDocument();
	});

	it('should countdown every second', async () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 65 // 1:05
			}
		});

		expect(screen.getByText('01:05')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1000);
		expect(screen.getByText('01:04')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1000);
		expect(screen.getByText('01:03')).toBeInTheDocument();
	});

	it('should render "Okay, got it" button when more than 10 seconds left', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 300
			}
		});

		expect(screen.getByRole('button', { name: /okay, got it/i })).toBeInTheDocument();
	});

	it('should render "Start Test" button when 10 seconds or less', async () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 10
			}
		});

		expect(screen.getByRole('button', { name: /start test/i })).toBeInTheDocument();
	});

	it('should display instruction message', () => {
		render(PreTestTimer, {
			props: {
				timeLeft: 300
			}
		});

		expect(screen.getByText(/thoroughly review the provided instructions/i)).toBeInTheDocument();
	});

	it('should show circular progress indicator when less than 10 minutes', () => {
		const { container } = render(PreTestTimer, {
			props: {
				timeLeft: 300
			}
		});

		const svg = container.querySelector('svg');
		expect(svg).toBeInTheDocument();
	});
});
