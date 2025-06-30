<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import PreTestTimer from './PreTestTimer.svelte';

	const { testDetails } = $props();
	let isChecked = $state(false);
	let showPreTestTimer = $state(false);
	let candidateData = $state<any>(null);

	const testOverview = [
		{ label: 'Total questions', value: `${testDetails.total_questions} questions` },
		{ label: 'Total marks', value: `${testDetails.marks ? testDetails.marks + ' marks' : 'N/A'}` },
		{ label: 'Total duration', value: `${testDetails.time_limit * 60} minutes` },
		{ label: 'Questions per page', value: `${testDetails.question_pagination} question` }
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
			<h2 class="text-muted-foreground mb-4 text-xs font-bold">
				{@html testDetails.start_instructions}
			</h2>
		{/if}
	</div>
</section>

<div class="fixed bottom-0 z-20 w-screen bg-white p-3">
	<div class="mx-auto flex items-center justify-around space-x-3 sm:w-3/5">
		<div class="flex items-center space-x-2">
			<Checkbox id="terms" aria-labelledby="terms-label" bind:checked={isChecked} />
			<label id="terms-label" for="terms" class="text-xs sm:text-sm">
				I have read and understood the instructions as given
			</label>
		</div>
		<form method="POST" action="?/createCandidate" use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success' && result.data && 'candidateData' in result.data) {
					candidateData = result.data.candidateData;
					showPreTestTimer = true;
				}
			};
		}}>
			<input name="deviceInfo" value={JSON.stringify(navigator.userAgent)} hidden />
			<Button type="submit" disabled={!isChecked} class={buttonVariants({ variant: 'default', size: 'sm' })}>
				Start
			</Button>
		</form>
	</div>
</div>

{#if candidateData}
	<PreTestTimer 
		candidateTestId={candidateData.candidate_test_id}
		candidateUuid={candidateData.candidate_uuid}
		bind:open={showPreTestTimer}
	/>
{/if}

{#snippet container(item: { title: String; points: String[] })}
	<div class="mb-10">
		<h2 class="text-muted-foreground text-xs font-bold uppercase">{item.title}</h2>
		<ul class="my-3 rounded-xl border p-3 text-xs font-normal">
			{#each item.points as point}
				<li>{point}</li>
			{/each}
		</ul>
	</div>
{/snippet}
