<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import PreTestTimer from './PreTestTimer.svelte';

	const { testDetails } = $props();
	let isChecked = $state(false);

	const testOverview = [
		{ label: 'Total questions', value: `${testDetails.total_questions} questions` },
		{
			label: 'Total marks',
			value: `${testDetails.marks ? testDetails.marks + ' marks' : 'N/A'}`
		},
		{
			label: 'Total duration',
			value: `${testDetails.time_limit ? testDetails.time_limit + ' minutes' : 'N/A'}`
		},
		{
			label: 'Questions per page',
			value: `${testDetails.question_pagination ? testDetails.question_pagination + ' question(s)' : 'All questions'}`
		}
	];
</script>

<section class="mx-auto max-w-xl p-6">
	<h1 class="mb-4 text-xl font-semibold">{testDetails.name}</h1>
	<h2 class="text-muted-foreground mb-4 text-xs font-bold">Test Overview</h2>

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
			<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">GENERAL INSTRUCTIONS</h2>
			<p
				class="text-accent-foreground mt-3 rounded-lg px-4 py-5 text-[13px]/relaxed font-normal shadow"
			>
				{testDetails.start_instructions}
			</p>
		{/if}
	</div>
</section>

<div class="fixed bottom-0 z-20 w-screen bg-white p-4">
	<div class="mx-auto flex items-center justify-around space-x-3 sm:w-3/5">
		<div class="flex items-center space-x-2">
			<Checkbox id="terms" aria-labelledby="terms-label" bind:checked={isChecked} />
			<label id="terms-label" for="terms" class="text-xs sm:text-sm">
				I have read and understood the instructions as given
			</label>
		</div>
		{#if page.data?.timeToBegin === 0}
			<form method="POST" action="?/createCandidate" use:enhance>
				<input
					name="deviceInfo"
					value={() => {
						if (browser) return JSON.stringify(navigator.userAgent);
					}}
					hidden
				/>
				<Button type="submit" class="w-32" disabled={!isChecked}>Start</Button>
			</form>
		{:else}
			<Dialog.Root>
				<Dialog.Trigger
					disabled={!isChecked}
					class={`w-45 ${buttonVariants({ variant: 'default' })}`}
				>
					Start
				</Dialog.Trigger>
				<PreTestTimer timeLeft={page.data?.timeToBegin} />
			</Dialog.Root>
		{/if}
	</div>
</div>
