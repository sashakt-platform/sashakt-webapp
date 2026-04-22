<script lang="ts">
	import { page } from '$app/state';
	import TestTimer from '$lib/components/TestTimer.svelte';
	import '../app.css';
	import { register, init, isLoading } from 'svelte-i18n';
	import { languages, DEFAULT_LANGUAGE } from '$lib/utils';

	let { children } = $props();

	register(languages.English, () => import('$locales/en-US.json'));
	register(languages.Hindi, () => import('$locales/hi-IN.json'));

	init({
		fallbackLocale: DEFAULT_LANGUAGE,
		initialLocale: DEFAULT_LANGUAGE
	});
</script>

<nav class="bg-card sticky top-0 z-50 mb-1 flex items-center justify-between p-5">
	<span
		class="text-primary mx-auto h-3.5 w-22.75 scroll-m-20 text-center text-xl font-extrabold tracking-tight
         uppercase lg:h-[15.36px] lg:w-[103.17px]"
	>
		Sashakt
	</span>
	{#if page.data?.timeLeft !== null && page.data.candidate && !page.form?.submitTest}
		<TestTimer timeLeft={page.data?.timeLeft} />
	{/if}
</nav>

{#if $isLoading}
	<div>Loading Translations...</div>
{:else}
	{@render children()}
{/if}
