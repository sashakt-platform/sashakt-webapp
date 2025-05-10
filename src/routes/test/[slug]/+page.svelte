<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let isStarted = $state(false);
</script>

<section>
	{#if !isStarted}
		<LandingPage {data} bind:isStarted />
	{:else}
		<Question />
	{/if}
</section>
