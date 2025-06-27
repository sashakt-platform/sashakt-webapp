<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import { TimerHeader } from '$lib/components/ui/countdown';
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';

	let { data, form }: PageProps = $props();
	let isStarted = $state(!!data.candidate);
	let currentTimeLeft = $state<number | null>(null);

	$effect(() => {
		isStarted = !!data.candidate;
	});

	// Initialize timer from server data
	onMount(() => {
		// Set initial timer value from server data
		if (isStarted && data.testData.time_remaining_seconds !== undefined) {
			currentTimeLeft = data.testData.time_remaining_seconds;
		} else if (!isStarted && data.testData.pre_test_time_left_seconds !== undefined) {
			currentTimeLeft = data.testData.pre_test_time_left_seconds;
		}
	});

	const remainingTimeInSeconds = $derived(() => {
		// Use backend timer data when available (prioritize server time)
		if (currentTimeLeft !== null && currentTimeLeft !== undefined) {
			return currentTimeLeft > 0 ? currentTimeLeft : 0;
		}

		// Fallback to old client-side calculation if backend data not available
		const test = data.testData;
		const now = new Date().getTime();
		let target = null;

		// The candidate has started the test. Calculate their deadline.
		if (isStarted && test.time_limit) {
			// The backend puts candidate-specific test data in `test.candidate_test`
			const candidateStartTimeStr = test.candidate_test?.start_time;

			if (candidateStartTimeStr) {
				const candidateStartTime = new Date(candidateStartTimeStr).getTime();
				// Calculate deadline based on when the candidate started and the test duration
				const deadlineFromDuration = candidateStartTime + test.time_limit * 60 * 1000;

				// The test also has a hard end time
				const testEndTime = test.end_time ? new Date(test.end_time).getTime() : null;

				// The candidate's actual deadline is the earlier of the two
				const finalDeadline =
					testEndTime && testEndTime < deadlineFromDuration ? testEndTime : deadlineFromDuration;

				// Only return a target time if it's in the future
				if (finalDeadline > now) {
					target = finalDeadline;
				}
			}
		}

		// The test has not been started, but has a future start time. Show countdown to start.
		if (!isStarted && test.start_time) {
			const testStartTime = new Date(test.start_time).getTime();
			// Only return a target time if it's in the future
			if (testStartTime > now) {
				target = testStartTime;
			}
		}

		if (target) {
			return Math.round((target - now) / 1000);
		}

		// In all other cases, don't show a timer.
		return null;
	});

	function handleTimeout() {
		// Implement timeout logic, e.g., auto-submit the test
		alert('Time is up!');
		
		// Auto-submit the test if possible
		if (isStarted) {
			const form = document.querySelector('form[action*="submitTest"]') as HTMLFormElement;
			if (form) {
				form.requestSubmit();
			}
		}
	}
</script>

{#if remainingTimeInSeconds}
	<TimerHeader remainingTimeInSeconds={remainingTimeInSeconds} onTimeout={handleTimeout} />
{/if}

<section>
	{#if !isStarted}
		<LandingPage testDetails={data.testData} />
	{:else if form?.result}
		<TestResult resultData={form.result} testDetails={data.testData} />
	{:else if data.testQuestions?.question_revisions}
		<Question testQuestions={data.testQuestions} candidate={data.candidate} />
	{:else}
		<p>Loading test questions...</p>
	{/if}
</section>
