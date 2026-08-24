<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import {
		canAttemptAllQuestions,
		getQuestionSetQuestionCount,
		sortQuestionSets
	} from '$lib/helpers/questionSetHelpers';
	import type { TQuestionSetSummary } from '$lib/types';
	import PreTestTimer from './PreTestTimer.svelte';
	import RichText from './RichText.svelte';
	import MarkingSchemeCompact from './MarkingSchemeCompact.svelte';
	import { getQuestionTypeInstruction } from '$lib/helpers/questionTypeLabels';
	import { t } from 'svelte-i18n';

	let {
		testDetails,
		isResumed = false,
		isExternalLaunch = false,
		showProfileForm = $bindable()
	} = $props();

	const showMarkingScheme = $derived(testDetails?.show_marks ?? true);

	const sectionRows = $derived(
		questionSets.map((set) => {
			const questionCount = getQuestionSetQuestionCount(set);
			const scheme = set.marking_scheme ?? null;
			return {
				typeInstruction: getQuestionTypeInstruction(set.question_type),
				key: `${set.id ?? set.title}-${set.display_order}`,
				title: set.title,
				description: set.description,
				questionCount,
				maxQuestionsAllowedToAttempt: set.max_questions_allowed_to_attempt,
				attemptsAll: canAttemptAllQuestions(set.max_questions_allowed_to_attempt, questionCount),
				markingScheme: scheme
			};
		})
	);

	let isStarting = $state(false);
	let createError = $state<string | null>(null);

	// This org only allows candidates who arrive from their student portal. Say so
	// here rather than letting them fill in the form and only then be turned away.
	const isBlockedAnonymous = $derived(
		testDetails.blocks_anonymous_start === true && !isExternalLaunch
	);

	// On resume the pre-test form/OMR choice was already completed, so the button
	// starts the attempt directly (like a test with no form) and reads "Resume".
	const usesStartFlow = $derived(
		!isResumed && (testDetails.omr === 'OPTIONAL' || !!testDetails.form)
	);
	const startLabel = $derived(isResumed ? $t('Resume Test') : $t('Start Test'));

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

	const questionSets = $derived(
		sortQuestionSets((testDetails.question_sets ?? []) as TQuestionSetSummary[])
	);
</script>

<!-- pb-32 clears the fixed start bar below; without it the last section card
     sits underneath it and cannot be scrolled into view. -->
<section class="bg-muted min-h-screen px-4 pt-6 pb-32">
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
					<RichText
						content={testDetails.start_instructions}
						class="text-foreground text-[13px]/relaxed"
					/>
				</div>
			</div>
		{/if}
	</div>
	{#if questionSets.length > 0}
		<div class="align-center mx-auto mt-8 max-w-xl border-t pt-4">
			<h2 class="text-foreground mb-4 text-center text-sm font-bold uppercase">
				{$t('Sections')}
			</h2>
			<!-- A table, not a card each: a paper can carry eight or more sections,
			     and this screen exists to compare them. -->
			<div class="overflow-x-auto">
				<div class="bg-card w-full rounded-2xl border">
					<table class="w-full text-sm">
						<thead class="bg-section-header">
							<tr class="text-muted-foreground text-left text-xs font-semibold uppercase">
								<th class="w-full px-3 py-2.5 font-semibold">{$t('Section')}</th>
								<th class="py-2.5 pr-3 pl-2 text-right font-semibold whitespace-nowrap"
									>{$t('Questions')}</th
								>
								{#if showMarkingScheme}
									<th class="py-2.5 pr-3 pl-2 text-right font-semibold whitespace-nowrap">
										{$t('Correct')} / {$t('Incorrect')}
									</th>
								{/if}
							</tr>
						</thead>
						<tbody class="divide-border divide-y">
							{#each sectionRows as row (row.key)}
								<tr>
									<td class="px-3 py-2.5">
										<p class="text-card-foreground font-medium">{row.title}</p>
										{#if row.typeInstruction}
											<p class="text-muted-foreground mt-0.5 text-xs">{$t(row.typeInstruction)}</p>
										{/if}
										<!-- Only where it restricts: a column reading "All" everywhere
										     else says nothing. -->
										{#if !row.attemptsAll}
											<p class="text-warning mt-0.5 text-xs">
												{$t('Attempt any {count} of {total}', {
													values: {
														count: row.maxQuestionsAllowedToAttempt,
														total: row.questionCount
													}
												})}
											</p>
										{/if}
										{#if row.description}
											<RichText
												content={row.description}
												class="text-muted-foreground mt-1 text-xs"
											/>
										{/if}
									</td>
									<td
										class="text-foreground py-2.5 pr-3 pl-2 text-right align-top whitespace-nowrap"
									>
										{row.questionCount}
									</td>
									{#if showMarkingScheme}
										<td class="py-2.5 pr-3 pl-2 text-right align-top">
											{#if row.markingScheme}
												<MarkingSchemeCompact scheme={row.markingScheme} />
											{:else}
												<span class="text-muted-foreground">--</span>
											{/if}
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
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
			{#if isBlockedAnonymous}
				{$t('Please open this test from your student portal.')}
			{:else}
				{$t(
					'By clicking "{action}," you confirm that you have read and understood all instructions.',
					{ values: { action: startLabel } }
				)}
			{/if}
		</p>
		<div class="lg:shrink-0">
			{#if isBlockedAnonymous}
				<Button class="w-full lg:w-auto" disabled>
					{startLabel} →
				</Button>
			{:else if page.data?.timeToBegin === 0}
				{#if usesStartFlow}
					<Button onclick={handleStart} class="w-full lg:w-auto">
						{startLabel} →
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
							{startLabel} →
						</Button>
					</form>
				{/if}
			{:else}
				<Dialog.Root>
					<Dialog.Trigger class={`w-full lg:w-auto ${buttonVariants({ variant: 'default' })}`}>
						{startLabel} →
					</Dialog.Trigger>
					{#if usesStartFlow}
						<PreTestTimer timeLeft={page.data?.timeToBegin} bind:showProfileForm />
					{:else}
						<PreTestTimer timeLeft={page.data?.timeToBegin} />
					{/if}
				</Dialog.Root>
			{/if}
		</div>
	</div>
</div>
