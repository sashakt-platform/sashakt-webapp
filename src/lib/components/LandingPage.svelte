<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import PreTestTimer from './PreTestTimer.svelte';
	import { t } from 'svelte-i18n';

	let { testDetails, showProfileForm = $bindable() } = $props();

	let isStarting = $state(false);
	let createError = $state<string | null>(null);

	function handleStart() {
		if (page.data?.timeToBegin === 0) {
			showProfileForm = true;
		}
	}

	// enhance handler for createCandidate form action
	const handleCreateCandidateEnhance = createFormEnhanceHandler({
		setLoading: (loading) => (isStarting = loading),
		setError: (error) => (createError = error)
	});

	const testOverview = $derived(
		[
			{ label: $t('Total questions'), value: `${testDetails.total_questions}` },
			testDetails.total_marks
				? { label: $t('Total marks'), value: `${testDetails.total_marks}` }
				: null,
			{
				label: $t('Test duration'),
				value: testDetails.time_limit ? `${testDetails.time_limit} ${$t('minutes')}` : $t('N/A')
			},
			{
				label: $t('Questions per page'),
				value: testDetails.question_pagination
					? `${testDetails.question_pagination}`
					: $t('All questions')
			}
		].filter(Boolean)
	);
</script>

<section class="bg-muted min-h-screen px-4 py-6">
	<div class="mx-auto max-w-xl">
		<div class="mb-6 text-center">
			<h1 class="text-foreground mb-2 text-2xl leading-tight font-semibold">{testDetails.name}</h1>
			{#if testDetails.description}
				<p class="text-muted-foreground text-sm">{testDetails.description}</p>
			{/if}
		</div>

		<div class="border-border mb-6 overflow-hidden rounded-2xl border bg-white">
			<div class="bg-section-header border-border flex h-16 items-center gap-8 border-b px-5">
				<span class="text-muted-foreground text-xs font-bold tracking-wider uppercase">
					{$t('Test Overview')}
				</span>
			</div>

			{#each testOverview as item, i (item?.label)}
				<div
					class="flex w-full items-center justify-between gap-6 px-5
             py-4
             {i < testOverview.length - 1 ? 'border-border border-b' : ''}"
				>
					<span class="text-foreground truncate text-sm">
						{item?.label}
					</span>

					<span class="text-foreground text-right text-sm font-semibold">
						{item?.value}
					</span>
				</div>
			{/each}
		</div>
		{#if testDetails.start_instructions}
			<div class="border-border mb-24 overflow-hidden rounded-2xl border bg-white">
				<div class="bg-section-header border-border flex h-16 items-center gap-8 border-b px-5">
					<span class="text-muted-foreground text-xs font-bold tracking-wider uppercase"
						>{$t('Test Instructions')}</span
					>
				</div>
				<div class="px-5 py-4">
					<div class="text-foreground prose prose-sm text-[13px]/relaxed">
						{@html testDetails.start_instructions}
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

{#if createError}
	<div class="fixed right-0 bottom-24 left-0 z-20 mx-auto w-4/5 px-4">
		<div
			class="text-destructive border-destructive bg-destructive/10 rounded-lg border p-3 text-sm"
		>
			{createError}
		</div>
	</div>
{/if}

<div class="fixed bottom-0 z-20 w-screen border-t bg-white px-4 py-4">
	<div class="mx-auto max-w-xl lg:flex lg:items-center lg:gap-4">
		<p class="text-muted-foreground mb-2 text-center text-sm leading-[1.4] lg:mb-0 lg:text-left">
			{$t(
				'By clicking "Start Test," you confirm that you have read and understood all instructions.'
			)}
		</p>
		<div class="lg:shrink-0">
			{#if page.data?.timeToBegin === 0}
				{#if testDetails.omr === 'OPTIONAL' || testDetails.form}
					<Button onclick={handleStart} class="w-full lg:w-auto">
						{$t('Start Test')} →
					</Button>
				{:else}
					<form method="POST" action="?/createCandidate" use:enhance={handleCreateCandidateEnhance}>
						<input
							name="deviceInfo"
							value={() => {
								if (browser) return JSON.stringify(navigator.userAgent);
							}}
							hidden
						/>
						<Button type="submit" class="w-full lg:w-auto" disabled={isStarting}>
							{#if isStarting}
								<Spinner />
							{/if}
							{$t('Start Test')} →
						</Button>
					</form>
				{/if}
			{:else}
				<Dialog.Root>
					<Dialog.Trigger class={`w-full lg:w-auto ${buttonVariants({ variant: 'default' })}`}>
						{$t('Start Test')} →
					</Dialog.Trigger>
					{#if testDetails.omr === 'OPTIONAL' || testDetails.form}
						<PreTestTimer timeLeft={page.data?.timeToBegin} bind:showProfileForm />
					{:else}
						<PreTestTimer timeLeft={page.data?.timeToBegin} />
					{/if}
				</Dialog.Root>
			{/if}
		</div>
	</div>
</div>
