<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Countdown, TimerHeader } from '$lib/components/ui/countdown/index.js';

	const { testDetails } = $props();
	let isChecked = $state(false);

	const testOverview = [
		{ label: 'Total questions', value: `${testDetails.total_questions} questions` },
		{ label: 'Total marks', value: `${testDetails.marks ? testDetails.marks + ' marks' : 'N/A'}` },
		{ label: 'Total duration', value: `${testDetails.time_limit * 60} minutes` },
		{ label: 'Questions per page', value: `${testDetails.question_pagination} question` }
	];
</script>

{#if isStarted}
	<TimerHeader timeLimit={data.time_limit / 60} onTimeout={() => console.log('Time expired!')} />
{/if}

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
		<Dialog.Root>
			<Dialog.Trigger
				disabled={!isChecked}
				class={buttonVariants({ variant: 'default', size: 'sm' })}>Start</Dialog.Trigger
			>
			<Dialog.Content class="sm:max-w-[425px]">
				<Dialog.Header>
					<Dialog.Title class="my-3 text-center">Your test will begin shortly!</Dialog.Title>
					<Dialog.Description class="flex flex-col space-y-2 text-center">
						<p>Time remaining for the test</p>

						<div class="my-4 flex justify-center">
							<div class="timer-box">
								<Countdown 
									timeLimit={data.time_limit / 60} 
									onTimeout={() => console.log('Time expired!')} 
								/>
							</div>
						</div>

						<p>
							The test has not started yet. Please read the instructions carefully before starting
							the test.
						</p>
					</Dialog.Description>
				</Dialog.Header>

				<Dialog.Close>
					<form method="POST" action="?/createCandidate" use:enhance>
						<input name="deviceInfo" value={JSON.stringify(navigator.userAgent)} hidden />
						<Button type="submit">Okay, got it</Button>
					</form>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>

<style>
	.timer-box {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background-color: #e74c3c;
		color: white;
		border-radius: 8px;
		padding: 8px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.timer-label {
		font-weight: 600;
		font-size: 0.875rem;
	}
</style>

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
