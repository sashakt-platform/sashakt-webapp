<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import PreTestTimer from './PreTestTimer.svelte';
	import { t } from 'svelte-i18n';

	let { testDetails, showProfileForm = $bindable() } = $props();

	let isChecked = $state(false);
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

	const testOverview = $derived([
		{
			label: $t('Total questions'),
			value: `${testDetails.total_questions} ${$t('questions')}`
		},
		{
			label: $t('Total duration'),
			value: `${testDetails.time_limit ? testDetails.time_limit + ' ' + $t('minutes') : $t('N/A')}`
		},
		{
			label: $t('Questions per page'),
			value: `${testDetails.question_pagination ? testDetails.question_pagination + ' ' + $t('question(s)') : $t('All questions')}`
		}
	]);
</script>

<section class="mx-auto max-w-xl p-6">
	<h1 class="mb-4 text-xl font-semibold">{testDetails.name}</h1>
	<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">{$t('Test Overview')}</h2>

	<div class="mb-8 rounded-2xl border">
		<Table.Root>
			<Table.Body>
				{#each testOverview as item (item.label)}
					<Table.Row>
						<Table.Head class="border-r">{item.label}</Table.Head>
						<Table.Cell>{item.value}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
	<div>
		{#if testDetails.start_instructions}
			<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">
				{$t('General Instructions')}
			</h2>
			<p
				class="text-accent-foreground mt-3 rounded-lg px-4 py-5 text-[13px]/relaxed font-normal shadow"
			>
				{@html testDetails.start_instructions}
			</p>
		{/if}
	</div>
</section>

{#if createError}
	<div class="fixed right-0 bottom-20 left-0 z-20 mx-auto w-3/5 px-4">
		<div
			class="text-destructive border-destructive bg-destructive/10 rounded-lg border p-3 text-sm"
		>
			{createError}
		</div>
	</div>
{/if}

<div class="fixed bottom-0 z-20 w-screen bg-white p-4">
	<div class="mx-auto flex items-center justify-around space-x-3 sm:w-3/5">
		<div class="flex items-center space-x-2">
			<Checkbox id="terms" aria-labelledby="terms-label" bind:checked={isChecked} />
			<label id="terms-label" for="terms" class="text-xs sm:text-sm">
				{$t('I have read and understood the instructions as given')}
			</label>
		</div>
		{#if page.data?.timeToBegin === 0}
			{#if testDetails.omr === 'OPTIONAL' || testDetails.form}
				<Button onclick={handleStart} class="w-32" disabled={!isChecked}>{$t('Start')}</Button>
			{:else}
				<form method="POST" action="?/createCandidate" use:enhance={handleCreateCandidateEnhance}>
					<input
						name="deviceInfo"
						value={() => {
							if (browser) return JSON.stringify(navigator.userAgent);
						}}
						hidden
					/>
					<Button type="submit" class="w-32" disabled={!isChecked || isStarting}>
						{#if isStarting}
							<Spinner />
						{/if}
						{$t('Start')}
					</Button>
				</form>
			{/if}
		{:else}
			<Dialog.Root>
				<Dialog.Trigger
					disabled={!isChecked}
					class={`w-45 ${buttonVariants({ variant: 'default' })}`}
				>
					{$t('Start')}
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
