<script lang="ts">
	import { onDestroy } from 'svelte';

	// Props for the timer
	let {
		timeLimit = $bindable(60),
		remainingTimeInSeconds = $bindable(null),
		onTimeout = $bindable(() => {}),
		targetTime = $bindable(null)
	} = $props();

	// State for time tracking
	let remainingSeconds = $state(0);
	let intervalId = $state(null);
	let message = $state('');

	function calculateRemainingTime() {
		const now = new Date().getTime();
		const target = new Date(targetTime).getTime();
		const difference = target - now;

		if (difference <= 0) {
			remainingSeconds = 0;
			message = 'Test has started';
			if (intervalId) clearInterval(intervalId);
			// once the test starts, we can switch to countdown timer
			// for now let's just clear this interval
			return;
		}

		const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((difference % (1000 * 60)) / 1000);
		remainingSeconds = hours * 3600 + minutes * 60 + seconds;
		message = 'Test starts in:';
	}

	// Format time as HH:MM:SS
	function formatTime(seconds) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
			.toString()
			.padStart(2, '0')}`;
	}

	$effect(() => {
		if (targetTime) {
			// Handle countdown to a specific target time (pre-test)
			calculateRemainingTime();
			intervalId = setInterval(calculateRemainingTime, 1000);
		} else if (remainingTimeInSeconds !== null && remainingTimeInSeconds !== undefined) {
			// Handle countdown with specific remaining seconds from backend
			remainingSeconds = remainingTimeInSeconds;
			intervalId = setInterval(() => {
				remainingSeconds -= 1;

				if (remainingSeconds <= 0) {
					if (intervalId) clearInterval(intervalId);
					onTimeout();
				}
			}, 1000);
		} else {
			// Fallback to timeLimit in minutes (legacy behavior)
			remainingSeconds = timeLimit * 60;
			intervalId = setInterval(() => {
				remainingSeconds -= 1;

				if (remainingSeconds <= 0) {
					if (intervalId) clearInterval(intervalId);
					onTimeout();
				}
			}, 1000);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	});

	// Cleanup on component destruction
	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="countdown-timer">
	<div class="timer-display">
		{#if message}
			<span class="message">{message}</span>
		{/if}
		{#if remainingSeconds <= 180 && !targetTime}
			<!-- Less than 3 minutes remaining - show in red -->
			<span class="time-warning">{formatTime(remainingSeconds)}</span>
		{:else}
			<span>{formatTime(remainingSeconds)}</span>
		{/if}
	</div>
</div>

<style>
	.countdown-timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.message {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.timer-display {
		font-size: 1.5rem;
		font-weight: bold;
		color: inherit;
	}

	.time-warning {
		color: white;
		font-weight: bold;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 1;
		}
	}
</style>
