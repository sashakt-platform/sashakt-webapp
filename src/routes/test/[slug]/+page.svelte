<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import Question from '$lib/components/Question.svelte';
	import { setContext } from 'svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	setContext('test-data', data);
	let isStarted = $state(false);
	if (form?.success) {
		isStarted = true;
	}
</script>

<section>
	{#if !isStarted}
		<LandingPage />
	{:else}
		<Question />
	{/if}
</section>
