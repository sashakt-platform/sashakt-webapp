<script lang="ts">
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import {
		countQuestionStatuses,
		isQuestionAnswered,
		isQuestionBookmarked
	} from '$lib/helpers/questionPaletteHelpers';
	import { buildQuestionSetGroups, canAttemptAllQuestions } from '$lib/helpers/questionSetHelpers';
	import type { TQuestion, TQuestionSetCandidate, TSelection } from '$lib/types';
	import RichText from './RichText.svelte';
	import { t } from 'svelte-i18n';

	let {
		questions,
		questionSets = [],
		selections,
		currentQuestionIndex,
		onNavigate,
		maxRows
	}: {
		questions: TQuestion[];
		questionSets?: TQuestionSetCandidate[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
		maxRows?: number;
	} = $props();

	// Calculate max height for grid: rows * 40px (h-10) + (rows-1) * 8px (gap-2)
	const gridMaxHeight = $derived(maxRows ? `${maxRows * 40 + (maxRows - 1) * 8}px` : undefined);

	const stats = $derived(countQuestionStatuses(questions, selections));
	const groupedQuestionSets = $derived(buildQuestionSetGroups(questions, questionSets));
	const questionIndexById = $derived(
		new Map(questions.map((question, index) => [question.id, index]))
	);
</script>

<!-- Stats Legend -->
<div class="mb-4 grid grid-cols-2 gap-3">
	<div class="flex items-center gap-2">
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700"
		>
			{stats.answered}
		</span>
		<span class="text-sm text-gray-600">{$t('Answered')}</span>
	</div>

	<div class="flex items-center gap-2">
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700"
		>
			{stats.bookmarked}
		</span>
		<span class="text-sm text-gray-600">{$t('Marked for review')}</span>
	</div>

	<div class="flex items-center gap-2">
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500"
			aria-label={$t('Mandatory question indicator')}
		>
		</span>
		<span class="text-sm text-gray-600">{$t('Mandatory')}</span>
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
