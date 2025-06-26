<script lang="ts">
	import { page } from '$app/state';
	import TestTimer from '$lib/components/TestTimer.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<nav class="mb-1 flex items-center justify-between p-3">
	<h2 class="text-primary w-full scroll-m-20 text-3xl font-extrabold tracking-tighter uppercase">
		Sashakt
	</h2>
	{#if page.data.candidate && !page.form?.result}
		<TestTimer timeLeft={page.data?.timeLeft} />
	{/if}
</nav>

{@render children()}
