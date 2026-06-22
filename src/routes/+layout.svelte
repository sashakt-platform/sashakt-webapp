<script lang="ts">
	import { page } from '$app/state';
	import TestTimer from '$lib/components/TestTimer.svelte';
	import InstructionsDialog from '$lib/components/InstructionsDialog.svelte';
	import List from '@lucide/svelte/icons/list';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '$lib/components/ui/button';
	import { navState } from '$lib/navState.svelte';
	import '../app.css';
	import { register, init, isLoading } from 'svelte-i18n';
	import { languages, DEFAULT_LANGUAGE } from '$lib/utils';
	import { t } from 'svelte-i18n';
	import { onMount } from 'svelte';

	let { children } = $props();
	let isDesktop = $state(false);
	let viewportReady = $state(false);

	register(languages.English, () => import('$locales/en-US.json'));
	register(languages.Hindi, () => import('$locales/hi-IN.json'));

	init({
		fallbackLocale: DEFAULT_LANGUAGE,
		initialLocale: DEFAULT_LANGUAGE
	});

	const showTimer = $derived(
		page.data?.timeLeft !== null && page.data.candidate && !page.form?.submitTest
	);
	const pauseTimerWhenInactive = $derived(page.data.testData?.pause_timer_when_inactive ?? false);

	onMount(() => {
		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		const updateViewport = () => {
			isDesktop = mediaQuery.matches;
			viewportReady = true;
		};

		updateViewport();
		mediaQuery.addEventListener('change', updateViewport);

		return () => {
			mediaQuery.removeEventListener('change', updateViewport);
		};
	});
</script>

<nav class="bg-card border-border sticky top-0 z-50 border-b px-6 py-6">
	<div class="grid grid-cols-[auto_1fr_auto] items-center lg:hidden">
		<div class="flex items-center">
			{#if navState.onBack}
				<Button variant="outline" size="icon" onclick={navState.onBack}>
					<ArrowLeft class="h-5 w-5" />
				</Button>
			{:else if showTimer && (!viewportReady || !isDesktop)}
				<TestTimer
					timeLeft={page.data?.timeLeft}
					candidate={page.data.candidate}
					{pauseTimerWhenInactive}
					onBeforeSubmit={navState.onBeforeTimedSubmit}
				/>
			{/if}
		</div>

		<h2 class="text-primary scroll-m-20 text-center font-extrabold tracking-tight uppercase">
			Sashakt
		</h2>

		<div class="flex items-center justify-end gap-2">
			{#if navState.active}
				<InstructionsDialog instructions={navState.instructions} iconOnly />
				{#if navState.showPalette && navState.onPaletteOpen}
					<div class="relative">
						<button
							type="button"
							onclick={navState.onPaletteOpen}
							class="border-border flex h-9 w-9 items-center justify-center rounded-lg border"
							aria-label={$t('Open question palette')}
						>
							<List class="text-foreground h-5 w-5" />
						</button>
						{#if navState.remainingMandatoryCount > 0}
							<span
								class="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs"
							>
								{navState.remainingMandatoryCount}
							</span>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	{#if navState.active}
		<div class="hidden items-center justify-between lg:flex">
			<h2 class="text-primary text-xl font-extrabold tracking-tight uppercase">Sashakt</h2>
			<div class="flex items-center gap-3">
				{#if showTimer && viewportReady && isDesktop}
					<TestTimer
						timeLeft={page.data?.timeLeft}
						candidate={page.data.candidate}
						{pauseTimerWhenInactive}
						onBeforeSubmit={navState.onBeforeTimedSubmit}
					/>
				{/if}
				<InstructionsDialog instructions={navState.instructions} />
			</div>
		</div>
	{:else}
		<div class="hidden grid-cols-3 items-center lg:grid">
			<div class="flex items-center justify-center">
				{#if navState.onBack}
					<Button variant="outline" size="icon" onclick={navState.onBack}>
						<ArrowLeft class="h-5 w-5" />
					</Button>
				{/if}
			</div>
			<h2 class="text-primary text-center text-xl font-extrabold tracking-tight uppercase">
				Sashakt
			</h2>
			<div class="flex justify-end">
				{#if showTimer && viewportReady && isDesktop}
					<TestTimer
						timeLeft={page.data?.timeLeft}
						candidate={page.data.candidate}
						{pauseTimerWhenInactive}
						onBeforeSubmit={navState.onBeforeTimedSubmit}
					/>
				{/if}
			</div>
		</div>
	{/if}
</nav>

{#if $isLoading}
	<div>Loading Translations...</div>
{:else}
	{@render children()}
{/if}
