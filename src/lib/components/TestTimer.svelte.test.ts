import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { createMockResponse, mockCandidate } from '$lib/test-utils';
import TestTimer from './TestTimer.svelte';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: (node: HTMLFormElement, submit?: () => void | Promise<void>) => {
		const handleSubmit = (event: Event) => {
			event.preventDefault();
			void submit?.();
		};
		node.addEventListener('submit', handleSubmit);
		return {
			destroy: () => node.removeEventListener('submit', handleSubmit)
		};
	}
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

	it('flushes pending work before submitting when time is up', async () => {
		const onBeforeSubmit = vi.fn();
		render(TestTimer, {
			props: {
				timeLeft: 0,
				pauseTimerWhenInactive: false,
				onBeforeSubmit
			}
		});

		await vi.advanceTimersByTimeAsync(1000);
		await fireEvent.submit(document.querySelector('form') as HTMLFormElement);

		expect(onBeforeSubmit).toHaveBeenCalledOnce();
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
});
