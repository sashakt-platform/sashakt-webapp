<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import { TimerHeader } from '$lib/components/ui/countdown';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let isStarted = $state(!!data.candidate);
	let showResult = $state(false);

	$effect(() => {
		isStarted = !!data.candidate;
	});

	const targetTime = $derived(() => {
		const now = new Date();
		const test = data.testData;

		// The candidate has started the test. Calculate their deadline.
		if (isStarted && test.time_limit) {
			// The backend puts candidate-specific test data in `test.candidate_test`
			const candidateStartTimeStr = test.candidate_test?.start_time;

			if (candidateStartTimeStr) {
				const candidateStartTime = new Date(candidateStartTimeStr);
				// Calculate deadline based on when the candidate started and the test duration
				const deadlineFromDuration = new Date(
					candidateStartTime.getTime() + test.time_limit * 60 * 1000
				);

				// The test also has a hard end time
				const testEndTime = test.end_time ? new Date(test.end_time) : null;

				// The candidate's actual deadline is the earlier of the two
				const finalDeadline =
					testEndTime && testEndTime < deadlineFromDuration ? testEndTime : deadlineFromDuration;

				// Only return a target time if it's in the future
				return finalDeadline > now ? finalDeadline.toISOString() : null;
			}
		}

		// The test has not been started, but has a future start time. Show countdown to start.
		if (!isStarted && test.start_time) {
			const testStartTime = new Date(test.start_time);
			// Only return a target time if it's in the future
			return testStartTime > now ? test.start_time : null;
		}

		// In all other cases, don't show a timer.
		return null;
	});

	function handleTimeout() {
		// Implement timeout logic, e.g., auto-submit the test
		alert('Time is up!');
		showResult = true;
	}
</script>

{#if targetTime}
	<TimerHeader targetTime={targetTime} onTimeout={handleTimeout} />
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
