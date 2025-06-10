<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let isStarted = $state(false);
	let showResult = $state(false);

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
	{:else if showResult}
		<p>Test Result Component Placeholder</p>
	{:else}
		<Question
			Questions={data.testQuestions.question_revisions}
			candidate={data.candidate}
			bind:showResult
		/>
	{/if}
</section>
