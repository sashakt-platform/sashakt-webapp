<script lang="ts">
	import {
		countQuestionStatuses,
		isQuestionAnswered,
		isQuestionBookmarked
	} from '$lib/helpers/questionPaletteHelpers';
	import { cn } from '$lib/utils';
	import type { TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		questions,
		selections,
		currentQuestionIndex,
		onNavigate,
		cols = 5,
		gridPadding = 'p-5',
		showMarkForReview = true
	}: {
		questions: TQuestion[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
		cols?: number;
		gridPadding?: string;
		showMarkForReview?: boolean;
	} = $props();

	const stats = $derived(countQuestionStatuses(questions, selections));
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
