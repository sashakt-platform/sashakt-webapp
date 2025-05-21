<script lang="ts">
	import { onDestroy } from 'svelte';

	// Props for the timer
	let { timeLimit = $bindable(60), onTimeout = $bindable(() => {}) } = $props();

	// State for time tracking
	let remainingSeconds = $state(timeLimit * 60);
	let intervalId = $state(null);
	let timerActive = $state(false);

	// Format time as HH:MM:SS
	function formatTime(seconds) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Start timer
	function startTimer() {
		if (!timerActive && remainingSeconds > 0) {
			timerActive = true;
			intervalId = setInterval(() => {
				remainingSeconds -= 1;

				if (remainingSeconds <= 0) {
					clearInterval(intervalId);
					timerActive = false;
					onTimeout();
				}
			}, 1000);
		}
	}

	// Pause timer
	function pauseTimer() {
		if (timerActive) {
			clearInterval(intervalId);
			timerActive = false;
		}
	}

	// Reset timer
	function resetTimer() {
		clearInterval(intervalId);
		timerActive = false;
		remainingSeconds = timeLimit * 60;
	}

	// Cleanup on component destruction
	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	// Make functions available to parent components
	$effect(() => {
		if (timeLimit !== remainingSeconds / 60 && !timerActive) {
			resetTimer();
		}
	});
</script>

<div class="countdown-timer">
	<div class="timer-display">
		{#if remainingSeconds <= 180}
			<!-- Less than 3 minutes remaining - show in red -->
			<span class="time-warning">{formatTime(remainingSeconds)}</span>
		{:else}
			<span>{formatTime(remainingSeconds)}</span>
		{/if}
	</div>

	<!-- Controls visible only in development -->
	{#if import.meta.env.DEV}
		<div class="timer-controls">
			{#if timerActive}
				<button onclick={pauseTimer}>Pause</button>
			{:else}
				<button onclick={startTimer}>Start</button>
			{/if}
			<button onclick={resetTimer}>Reset</button>
		</div>
	{/if}
</div>

<style>
	.countdown-timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
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

	.timer-controls {
		display: flex;
		gap: 0.5rem;
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
