import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TestTimer from './TestTimer.svelte';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

describe('TestTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should render time in HH:MM:SS format', () => {
		render(TestTimer, {
			props: {
				timeLeft: 3661 // 1 hour, 1 minute, 1 second
			}
		});

		expect(screen.getByText('01:01:01')).toBeInTheDocument();
	});

	it('should render time with leading zeros', () => {
		render(TestTimer, {
			props: {
				timeLeft: 65 // 1 minute, 5 seconds
			}
		});

		expect(screen.getByText('00:01:05')).toBeInTheDocument();
	});

	it('should display green background when time is more than 10 minutes', () => {
		const { container } = render(TestTimer, {
			props: {
				timeLeft: 700 // ~11.6 minutes
			}
		});

		const timerDiv = container.querySelector('.bg-green-700');
		expect(timerDiv).toBeInTheDocument();
	});

	it('should display red background when time is 10 minutes or less', () => {
		const { container } = render(TestTimer, {
			props: {
				timeLeft: 600 // exactly 10 minutes
			}
		});

		const timerDiv = container.querySelector('.bg-red-700');
		expect(timerDiv).toBeInTheDocument();
	});

	it('should display red background when time is less than 10 minutes', () => {
		const { container } = render(TestTimer, {
			props: {
				timeLeft: 300 // 5 minutes
			}
		});

		const timerDiv = container.querySelector('.bg-red-700');
		expect(timerDiv).toBeInTheDocument();
	});

	it('should countdown every second', async () => {
		render(TestTimer, {
			props: {
				timeLeft: 10
			}
		});

		expect(screen.getByText('00:00:10')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1000);
		expect(screen.getByText('00:00:09')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1000);
		expect(screen.getByText('00:00:08')).toBeInTheDocument();
	});

	it('should render zero time correctly', () => {
		render(TestTimer, {
			props: {
				timeLeft: 0
			}
		});

		expect(screen.getByText('00:00:00')).toBeInTheDocument();
	});

	it('should handle large time values', () => {
		render(TestTimer, {
			props: {
				timeLeft: 7200 // 2 hours
			}
		});

		expect(screen.getByText('02:00:00')).toBeInTheDocument();
	});
});
