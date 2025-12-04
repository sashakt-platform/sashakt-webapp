<script lang="ts">
	import { page } from '$app/state';
	import TestTimer from '$lib/components/TestTimer.svelte';
	import '../app.css';
	import { register, init, isLoading } from 'svelte-i18n';
	import { LOCALES, DEFAULT_LOCALE } from '$lib/constants';

	// Register your translation files
	register(LOCALES.EN_US, () => import('$lib/locales/en-us.json'));
	register(LOCALES.HI_IN, () => import('$lib/locales/hi-in.json'));

	init({
		fallbackLocale: DEFAULT_LOCALE,
		initialLocale: DEFAULT_LOCALE
	});

	let { children } = $props();
</script>

<nav class="mb-1 flex items-center justify-between p-3">
	<h2 class="text-primary w-full scroll-m-20 text-3xl font-extrabold tracking-tighter uppercase">
		Sashakt
	</h2>
	{#if page.data?.timeLeft !== null && page.data.candidate && !page.form?.submitTest}
		<TestTimer timeLeft={page.data?.timeLeft} />
	{/if}
</nav>

{#if $isLoading}
	<div>Loading translations...</div>
{:else}
	{@render children()}
{/if}
