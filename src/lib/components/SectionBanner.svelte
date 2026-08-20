<script lang="ts">
	import MarkingSchemeInline from '$lib/components/MarkingSchemeInline.svelte';
	import RichText from '$lib/components/RichText.svelte';
	import { canAttemptAllQuestions } from '$lib/helpers/questionSetHelpers';
	import { GRADABLE_QUESTION_TYPES } from '$lib/helpers/feedbackHelpers';
	import type { TMarks, TQuestion, question_type_enum } from '$lib/types';
	import { t } from 'svelte-i18n';

	/**
	 * The header shown above a section, on the landing page, above the questions
	 * themselves, and in answer review.
	 *
	 * Previously this markup was repeated in each of those places, so a change to
	 * one left the others behind and the marking scheme was shown in none of them.
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

	// The marking scheme's wording is type-specific (the partial-marks ladder
	// only applies to multi-choice), so it needs a question type. A section is
	// homogeneous by construction, so the first question represents the set.
	const sectionQuestionType = $derived(
		questions[0]?.question_type as question_type_enum | undefined
	);

	// Show the scheme where marks are meaningful. The question type is only
	// needed to gate the partial-marks block, and the landing page's section
	// summary carries no question list — so an unknown type still shows the
	// scheme, it just cannot claim the set is multi-choice.
	// A partial-marks ladder only exists on a multi-choice set, so its presence
	// identifies the type when the payload does not carry one.
	const inferredQuestionType = $derived(
		markingScheme?.partial?.correct_answers?.length
			? ('multi-choice' as question_type_enum)
			: undefined
	);

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

	<!-- Only state the attempt rule when it restricts the candidate. Saying "you
	     may attempt all questions" adds a line without adding information. -->
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
