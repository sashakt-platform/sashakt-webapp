<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<section>
	{#if data.candidate === undefined}
		<!-- Show nothing or a loading spinner while candidate is loading -->
		<p>Loading...</p>
	{:else if !data.candidate}
		<LandingPage testDetails={data.testData} />
	{:else if form?.result}
		<TestResult resultData={form.result} testDetails={data.testData} />
	{:else if data.testQuestions?.question_revisions}
		<Question testQuestions={data.testQuestions} candidate={data.candidate} />
	{:else}
		<p>Loading test questions...</p>
	{/if}
</section>
