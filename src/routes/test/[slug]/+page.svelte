<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let isStarted = $state(false);
	$effect(() => {
		if (data.candidate) {
			isStarted = true;
		} else {
			isStarted = false;
		}
	});
</script>

<section>
	{#if !isStarted}
		<LandingPage testDetails={data.testData} />
	{:else if form?.submitTest}
		<TestResult resultData={form.result} testDetails={data.testData} />
	{:else if data.testQuestions?.question_revisions}
		<Question testQuestions={data.testQuestions} candidate={data.candidate} />
	{:else}
		<p>Loading test questions...</p>
	{/if}
</section>
