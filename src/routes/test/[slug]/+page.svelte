<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let isStarted = $state(false);

	$effect(() => {
		if (data.candidateId) {
			isStarted = true;
		} else {
			isStarted = false;
		}
	});
</script>

<section>
	{#if !isStarted}
		<LandingPage testDetails={data.testData} />
	{:else}
		<Question />
	{/if}
</section>
