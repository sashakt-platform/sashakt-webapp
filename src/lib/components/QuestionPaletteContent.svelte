<script lang="ts">
	import {
		countQuestionStatuses,
		isQuestionAnswered,
		isQuestionBookmarked
	} from '$lib/helpers/questionPaletteHelpers';
	import { buildQuestionSetGroups, canAttemptAllQuestions } from '$lib/helpers/questionSetHelpers';
	import type { TQuestion, TQuestionSetCandidate, TSelection } from '$lib/types';
	import RichText from './RichText.svelte';
	import { cn } from '$lib/utils';
	import { t } from 'svelte-i18n';
	import { Bookmark } from '@lucide/svelte';

	let {
		questions,
		questionSets = [],
		selections,
		currentQuestionIndex,
		onNavigate,
		cols = 5,
		gridPadding = 'p-5',
		showMarkForReview = true
	}: {
		questions: TQuestion[];
		questionSets?: TQuestionSetCandidate[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
		cols?: number;
		gridPadding?: string;
		showMarkForReview?: boolean;
	} = $props();

	const stats = $derived(countQuestionStatuses(questions, selections));
	const groupedQuestionSets = $derived(buildQuestionSetGroups(questions, questionSets));
	const questionIndexById = $derived(
		new Map(questions.map((question, index) => [question.id, index]))
	);
</script>

<div class={gridPadding}>
	<div class="grid gap-2" style:grid-template-columns="repeat({cols}, minmax(0, 1fr))">
		{#each questions as question, index (question.id)}
			{@const isAnswered = isQuestionAnswered(question.id, selections)}
			{@const isBookmarked = isQuestionBookmarked(question.id, selections)}
			{@const isCurrent = index === currentQuestionIndex}
			<div class="flex items-center justify-center">
				<div class="relative">
					{#if question.is_mandatory}
						<span
							class="text-destructive absolute -top-1 right-0 text-sm leading-none font-bold select-none"
							aria-hidden="true">*</span
						>
					{/if}
					<button
						type="button"
						class={cn(
							'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-sm font-medium transition-colors',
							isAnswered
								? 'bg-success-subtle text-success'
								: 'border-border bg-card text-muted-foreground border',
							showMarkForReview && isBookmarked ? 'border-warning border-2' : '',
							isCurrent ? 'ring-primary ring-2 ring-offset-1' : ''
						)}
						onclick={() => onNavigate(index)}
						aria-label={$t('Go to question {number}', { values: { number: index + 1 } })}
					>
						{index + 1}
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>

{#snippet questionButton(question: TQuestion, index: number)}
	{@const isAnswered = isQuestionAnswered(question.id, selections)}
	{@const isBookmarked = isQuestionBookmarked(question.id, selections)}
	{@const isCurrent = index === currentQuestionIndex}
	<button
		type="button"
		class="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-sm font-medium transition-colors
			{isCurrent ? 'border-2 border-blue-500' : ''}
			{isAnswered ? 'bg-blue-100 text-blue-700' : ''}
			{!isCurrent && !isAnswered ? 'border border-gray-300 bg-white text-gray-500' : ''}
			{isCurrent && !isAnswered ? 'bg-white text-blue-500' : ''}"
		onclick={() => onNavigate(index)}
		aria-label={$t('Go to question {number}', { values: { number: index + 1 } })}
	>
		{index + 1}
		{#if question.is_mandatory}
			<span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"></span>
		{/if}
		{#if isBookmarked}
			<Bookmark class="absolute -right-1 -bottom-1 h-3 w-3 fill-amber-500 text-amber-500" />
		{/if}
	</button>
{/snippet}

{#if groupedQuestionSets.length > 0}
	<div class="space-y-4">
		{#each groupedQuestionSets as group (`${group.section.id ?? group.section.title}-${group.startIndex}`)}
			<div class="space-y-3">
				<div class="rounded-xl border bg-slate-50 p-3">
					<p class="text-sm font-semibold text-slate-800">{group.section.title}</p>
					{#if group.section.description}
						<RichText
							content={group.section.description}
							class="text-muted-foreground mt-1 text-xs leading-relaxed"
						/>
					{/if}
					<p class="text-muted-foreground mt-2 text-xs leading-relaxed">
						{#if canAttemptAllQuestions(group.section.max_questions_allowed_to_attempt, group.questions.length)}
							{$t('You may attempt all questions in this section.')}
						{:else}
							{$t('You may attempt up to {count} questions in this section.', {
								values: { count: group.section.max_questions_allowed_to_attempt }
							})}
						{/if}
					</p>
				</div>
				<div
					class="grid grid-cols-5 gap-2 {maxRows ? 'overflow-y-auto' : ''}"
					style:max-height={gridMaxHeight}
				>
					{#each group.questions as question (question.id)}
						{@const index = questionIndexById.get(question.id) ?? 0}
						{@render questionButton(question, index)}
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div
		class="grid grid-cols-5 gap-2 {maxRows ? 'overflow-y-auto' : ''}"
		style:max-height={gridMaxHeight}
	>
		{#each questions as question, index (question.id)}
			{@render questionButton(question, index)}
		{/each}
	</div>
{/if}
<div class="border-border grid grid-cols-2 gap-4 border-t p-5">
	<div class="flex items-center gap-2">
		<span class="border-border bg-card h-7 w-7 shrink-0 rounded-full border"></span>
		<span class="text-foreground text-sm">{$t('Unanswered')}</span>
	</div>

	<div class="flex items-center gap-2">
		<span class="bg-success-subtle h-7 w-7 shrink-0 rounded-full"></span>
		<span class="text-foreground text-sm">{$t('Answered')}</span>
	</div>

	<div class="flex items-center gap-2">
		<div class="relative h-7 w-7 shrink-0">
			<span
				class="text-destructive absolute -top-1 right-0 text-sm leading-none font-bold select-none"
				aria-hidden="true">*</span
			>
			<span class="border-border bg-card block h-full w-full rounded-full border"></span>
		</div>
		<span class="text-foreground text-sm">{$t('Mandatory')}</span>
	</div>

	{#if showMarkForReview}
		<div class="flex items-center gap-2">
			<span class="border-warning bg-card h-7 w-7 shrink-0 rounded-full border-2"></span>
			<span class="text-foreground text-sm">{$t('Marked for Review')}</span>
		</div>
	{/if}
</div>
