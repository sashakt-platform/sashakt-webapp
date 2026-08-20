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
	import SectionBanner from './SectionBanner.svelte';
	import { t } from 'svelte-i18n';

	let {
		testDetails,
		isResumed = false,
		isExternalLaunch = false,
		showProfileForm = $bindable()
	} = $props();

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
					<RichText
						content={testDetails.start_instructions}
						class="text-foreground text-[13px]/relaxed"
					/>
				</div>
			</div>
		{/if}
	</div>
	{#if questionSets.length > 0}
		<div class="align-center mt-8 border-t pt-4">
			<h2 class="text-foreground mb-4 text-center text-sm font-bold uppercase">
				{$t('Sections')}
			</h2>
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				{#each questionSets as questionSet (`${questionSet.id ?? questionSet.title}-${questionSet.display_order}`)}
					<SectionBanner
						title={questionSet.title}
						description={questionSet.description}
						maxQuestionsAllowedToAttempt={questionSet.max_questions_allowed_to_attempt}
						questionCount={getQuestionSetQuestionCount(questionSet)}
						questions={questionSet.question_revisions ?? []}
						markingScheme={questionSet.marking_scheme}
						showMarkingScheme={testDetails?.show_marks ?? true}
						showQuestionCount
						class="bg-card mx-auto w-full rounded-2xl border p-4 lg:w-2/3"
					/>
				{/each}
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
