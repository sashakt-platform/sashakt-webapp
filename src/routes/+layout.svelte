<script lang="ts">
	import { page } from '$app/state';
	import TestTimer from '$lib/components/TestTimer.svelte';
	import '../app.css';
	import { register, init, isLoading } from 'svelte-i18n';
	import { languages, DEFAULT_LANGUAGE } from '$lib/utils';

	let { children } = $props();

	register(languages.Hindi, () => import('$locales/hi-IN.json'));

	init({
		fallbackLocale: DEFAULT_LANGUAGE,
		initialLocale: DEFAULT_LANGUAGE
	});
</script>

<nav class="bg-background sticky top-0 z-50 mb-1 flex items-center justify-between p-5">
	<h2 class="text-primary w-full scroll-m-20 text-3xl font-extrabold tracking-tighter uppercase">
		Sashakt
	</h2>
	{#if page.data?.timeLeft !== null && page.data.candidate && !page.form?.submitTest}
		<TestTimer timeLeft={page.data?.timeLeft} />
	{/if}
</nav>

{#if $isLoading}
	<div>Loading Translations...</div>
{:else}
	{@render children()}
{/if}
