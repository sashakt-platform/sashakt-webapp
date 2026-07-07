import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { createMockResponse, mockCandidate } from '$lib/test-utils';
import { testTimerState } from '$lib/testTimerState.svelte';
import TestTimer from './TestTimer.svelte';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: { params: { slug: 'sample-test' } }
}));

describe('TestTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', vi.fn());
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			value: 'visible'
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		testTimerState.resetForTests();
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

		const timerDiv = container.querySelector('.bg-success-subtle');
		expect(timerDiv).toBeInTheDocument();
	});

	it('should display red background when time is 10 minutes or less', () => {
		const { container } = render(TestTimer, {
			props: {
				timeLeft: 600 // exactly 10 minutes
			}
		});

		const timerDiv = container.querySelector('.bg-error-subtle');
		expect(timerDiv).toBeInTheDocument();
	});

	it('should display red background when time is less than 10 minutes', () => {
		const { container } = render(TestTimer, {
			props: {
				timeLeft: 300 // 5 minutes
			}
		});

		const timerDiv = container.querySelector('.bg-error-subtle');
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

	it('shows Time Up dialog when loaded with timeLeft already zero and pause is disabled', async () => {
		render(TestTimer, {
			props: {
				timeLeft: 0,
				pauseTimerWhenInactive: false
			}
		});

		await vi.advanceTimersByTimeAsync(1000);

		expect(screen.getByText('Time Up!')).toBeInTheDocument();
	});

	it('does not sync timer when pauseTimerWhenInactive is disabled', async () => {
		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: mockCandidate,
				pauseTimerWhenInactive: false
			}
		});

		await Promise.resolve();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('syncs timer on mount when pauseTimerWhenInactive is enabled', async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({ time_left: 120 }) as unknown as Response
		);

		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: mockCandidate,
				pauseTimerWhenInactive: true
			}
		});

		await Promise.resolve();
		expect(fetch).toHaveBeenCalledWith('/test/sample-test/api/timer', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ candidate: mockCandidate, event: 'resume' })
		});

		await vi.advanceTimersByTimeAsync(15000);
		expect(fetch).toHaveBeenLastCalledWith(
			'/test/sample-test/api/timer',
			expect.objectContaining({
				body: JSON.stringify({ candidate: mockCandidate, event: 'heartbeat' })
			})
		);
	});

	it('does not increase the displayed timer when server returns a higher time_left', async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({ time_left: 150 }) as unknown as Response
		);

		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: mockCandidate,
				pauseTimerWhenInactive: true
			}
		});

		await Promise.resolve();
		await Promise.resolve();

		expect(screen.getByText('00:02:00')).toBeInTheDocument();
	});

	it('keeps local countdown when timer sync fails', async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse(
				{ error: 'Failed to sync timer' },
				{ ok: false, status: 500 }
			) as unknown as Response
		);

		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: mockCandidate,
				pauseTimerWhenInactive: true
			}
		});

		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(1000);

		expect(screen.getByText('00:01:59')).toBeInTheDocument();
	});

	it('ignores timer sync responses without numeric time_left', async () => {
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({ time_left: null }) as unknown as Response
		);

		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: mockCandidate,
				pauseTimerWhenInactive: true
			}
		});

		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(1000);

		expect(screen.getByText('00:01:59')).toBeInTheDocument();
	});

	it('ignores stale timer sync responses that resolve after a newer sync', async () => {
		let resolveFirstRequest: ((value: Response) => void) | undefined;

		vi.mocked(fetch)
			.mockImplementationOnce(
				() =>
					new Promise<Response>((resolve) => {
						resolveFirstRequest = resolve;
					})
			)
			.mockResolvedValueOnce(createMockResponse({ time_left: 90 }) as unknown as Response);

		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: mockCandidate,
				pauseTimerWhenInactive: true
			}
		});

		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(15000);
		await Promise.resolve();
		await Promise.resolve();

		expect(screen.getByText('00:01:30')).toBeInTheDocument();

		resolveFirstRequest?.(createMockResponse({ time_left: 110 }) as unknown as Response);
		await Promise.resolve();
		await Promise.resolve();

		expect(screen.getByText('00:01:30')).toBeInTheDocument();
	});

	it('does not sync timer when pauseTimerWhenInactive is enabled without a candidate', async () => {
		render(TestTimer, {
			props: {
				timeLeft: 120,
				candidate: null,
				pauseTimerWhenInactive: true
			}
		});

		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(15000);

		expect(fetch).not.toHaveBeenCalled();
	});

	describe('10-minute warning dialog', () => {
		it('shows the warning dialog when countdown reaches 10 minutes', async () => {
			// Start at 601: tick 1 → 600, tick 2 → open=true + 599
			render(TestTimer, { props: { timeLeft: 601 } });

			await vi.advanceTimersByTimeAsync(2000);

			expect(screen.getByText('10 mins left!')).toBeInTheDocument();
		});

		it('does not show the warning dialog when timeLeft is above 10 minutes', () => {
			render(TestTimer, { props: { timeLeft: 700 } });

			expect(screen.queryByText('10 mins left!')).not.toBeInTheDocument();
		});

		it('shows the warning description text when dialog opens', async () => {
			render(TestTimer, { props: { timeLeft: 601 } });

			await vi.advanceTimersByTimeAsync(2000);

			expect(
				screen.getByText(
					'Please note that there is only 10 mins left for the test to complete, hurry up!'
				)
			).toBeInTheDocument();
		});

		it('closes the warning dialog when Okay button is clicked', async () => {
			render(TestTimer, { props: { timeLeft: 601 } });

			await vi.advanceTimersByTimeAsync(2000);

			// bits-ui Dialog.Close wraps Button, so there may be nested button elements — pick the innermost
			const okayButtons = screen.getAllByRole('button', { name: /okay/i });
			okayButtons[0].click();

			await waitFor(() => {
				expect(screen.queryByText('10 mins left!')).not.toBeInTheDocument();
			});
		});

		it('does not reopen after being dismissed when a resume sync and the countdown tick detect the same threshold independently', async () => {
			// Both a resume sync response and the countdown's own first tick
			// can independently notice timeLeft === 600; without a one-time
			// latch, dismissing the dialog after the first detection gets
			// reopened moments later by the second one.
			vi.mocked(fetch).mockResolvedValue(
				createMockResponse({ time_left: 600 }) as unknown as Response
			);

			render(TestTimer, {
				props: { timeLeft: 600, candidate: mockCandidate, pauseTimerWhenInactive: true }
			});

			// let the resume sync resolve and open the dialog
			await vi.waitFor(() => {
				expect(screen.getByText('10 mins left!')).toBeInTheDocument();
			});

			const okayButtons = screen.getAllByRole('button', { name: /okay/i });
			okayButtons[0].click();
			await waitFor(() => {
				expect(screen.queryByText('10 mins left!')).not.toBeInTheDocument();
			});

			// the countdown's own first tick also observes timeLeft === 600
			// at this point; it must not reopen the dialog
			await vi.advanceTimersByTimeAsync(1000);
			expect(screen.queryByText('10 mins left!')).not.toBeInTheDocument();
		});
	});

	describe('multiple simultaneous instances', () => {
		// Regression coverage for the layout mounting one TestTimer per
		// responsive breakpoint (mobile + desktop) at the same time.
		it('shows only one 10-minute warning dialog when two instances are mounted', async () => {
			render(TestTimer, { props: { timeLeft: 601 } });
			render(TestTimer, { props: { timeLeft: 601 } });

			await vi.advanceTimersByTimeAsync(2000);

			expect(screen.getAllByText('10 mins left!')).toHaveLength(1);
		});

		it('keeps both instances displaying the same countdown', async () => {
			render(TestTimer, { props: { timeLeft: 10 } });
			render(TestTimer, { props: { timeLeft: 10 } });

			expect(screen.getAllByText('00:00:10')).toHaveLength(2);

			await vi.advanceTimersByTimeAsync(1000);
			expect(screen.getAllByText('00:00:09')).toHaveLength(2);
		});

		it('keeps the countdown running after the owning instance unmounts', async () => {
			const first = render(TestTimer, { props: { timeLeft: 10 } });
			render(TestTimer, { props: { timeLeft: 10 } });

			await vi.advanceTimersByTimeAsync(1000);
			expect(screen.getAllByText('00:00:09')).toHaveLength(2);

			first.unmount();

			await vi.advanceTimersByTimeAsync(1000);
			expect(screen.getByText('00:00:08')).toBeInTheDocument();
		});
	});
});
