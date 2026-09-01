<script lang="ts">
	import MarkingSchemeInline from '$lib/components/MarkingSchemeInline.svelte';
	import RichText from '$lib/components/RichText.svelte';
	import { canAttemptAllQuestions } from '$lib/helpers/questionSetHelpers';
	import { GRADABLE_QUESTION_TYPES } from '$lib/helpers/feedbackHelpers';
	import { getQuestionTypeInstruction } from '$lib/helpers/questionTypeLabels';
	import type { TMarks, TQuestion, question_type_enum } from '$lib/types';
	import { t } from 'svelte-i18n';

	/**
	 * The header shown above a section — on the landing page, above the questions,
	 * and in answer review. This markup was previously duplicated in each place,
	 * so the marking scheme was shown in none of them.
	 */
	let {
		title,
		description = null,
		maxQuestionsAllowedToAttempt,
		questionCount,
		questions = [],
		markingScheme = null,
		showMarkingScheme = false,
		showQuestionCount = false,
		class: className = '',
		id = undefined
	}: {
		title: string;
		description?: string | null;
		maxQuestionsAllowedToAttempt: number;
		questionCount: number;
		questions?: TQuestion[];
		markingScheme?: TMarks | null;
		showMarkingScheme?: boolean;
		showQuestionCount?: boolean;
		class?: string;
		id?: string;
	} = $props();

	const attemptsAll = $derived(canAttemptAllQuestions(maxQuestionsAllowedToAttempt, questionCount));

	// A section is homogeneous, so the first question gives its type.
	const sectionQuestionType = $derived(
		questions[0]?.question_type as question_type_enum | undefined
	);

	// The landing page carries no question list, so fall back to the scheme: a
	// partial ladder only exists on a multi-choice set.
	const inferredQuestionType = $derived(
		markingScheme?.partial?.correct_answers?.length
			? ('multi-choice' as question_type_enum)
			: undefined
	);

	// Null for an unknown type, so nothing is stated rather than something
	// guessed.
	const typeInstruction = $derived(
		getQuestionTypeInstruction(sectionQuestionType ?? inferredQuestionType)
	);

	// An unknown type still shows the scheme; the landing page cannot tell.
	const canShowMarkingScheme = $derived(
		showMarkingScheme &&
			!!markingScheme &&
			(!sectionQuestionType || GRADABLE_QUESTION_TYPES.has(sectionQuestionType))
	);
</script>

<div {id} class={className}>
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-card-foreground text-sm font-semibold">{title}</p>
			{#if typeInstruction}
				<p class="text-muted-foreground mt-0.5 text-xs">{$t(typeInstruction)}</p>
			{/if}
			{#if description}
				<RichText content={description} class="text-muted-foreground mt-1 text-sm" />
			{/if}
		</div>
		{#if showQuestionCount}
			<p class="text-muted-foreground shrink-0 text-xs">
				{questionCount}
				{$t('questions')}
			</p>
		{/if}
	</div>

	<!-- Only stated when it restricts the candidate; "you may attempt all
	     questions" is a line without information. -->
	{#if !attemptsAll}
		<p class="text-muted-foreground mt-2 text-sm">
			{$t('You may attempt up to {count} questions in this section.', {
				values: { count: maxQuestionsAllowedToAttempt }
			})}
		</p>
	{/if}

	{#if canShowMarkingScheme && markingScheme}
		<MarkingSchemeInline
			scheme={markingScheme}
			questionType={sectionQuestionType ?? inferredQuestionType}
		/>
	{/if}
</div>
