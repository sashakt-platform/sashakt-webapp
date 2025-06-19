<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import { TimerHeader } from '$lib/components/ui/countdown';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let isStarted = $state(false);
	let showResult = $state(false);

	let showTimer = $derived(isStarted || data.testData.test_start_time);

	$effect(() => {
		if (data.candidate) {
			isStarted = true;
		} else {
			isStarted = false;
		}
	});

	function handleTimeout() {
		// Implement timeout logic, e.g., auto-submit the test
		alert('Time is up!');
		showResult = true;
	}
</script>

{#if showTimer}
	<TimerHeader
		timeLimit={data.testData.duration}
		targetTime={isStarted ? null : data.testData.test_start_time}
		onTimeout={handleTimeout}
	/>
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
