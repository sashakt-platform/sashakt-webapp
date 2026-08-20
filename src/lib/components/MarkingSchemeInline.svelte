<script lang="ts">
	import { question_type_enum, type TMarks } from '$lib/types';
	import { t } from 'svelte-i18n';

	/**
	 * A one-line marking scheme, for section headers. MarkingSchemeContent is a
	 * stacked list sized for the per-question popover; stretched across a header
	 * its values sit far from their labels and the partial ladder runs to eight
	 * lines.
	 */
	let {
		scheme,
		questionType = undefined
	}: {
		scheme: TMarks;
		questionType?: question_type_enum;
	} = $props();

	// An undefined type means the caller could not tell, so show the ladder
	// rather than hide a scheme that exists.
	const showPartial = $derived(
		!!scheme.partial?.correct_answers?.length &&
			(questionType === undefined || questionType === question_type_enum.MULTIPLE)
	);

	const wrong = $derived(scheme.wrong > 0 ? `+${scheme.wrong}` : `${scheme.wrong}`);

	// "+1 / +2 / +3" — the popover spells out which count earns which.
	const partialSummary = $derived(
		(scheme.partial?.correct_answers ?? []).map((rule) => `+${rule.marks}`).join(' / ')
	);
</script>

<p class="text-muted-foreground mt-2 text-xs">
	<span class="text-success font-medium">+{scheme.correct}</span>
	{$t('Correct')}
	<span class="mx-1 opacity-40">·</span>
	<span class="text-error font-medium">{wrong}</span>
	{$t('Incorrect')}
	<span class="mx-1 opacity-40">·</span>
	<span class="font-medium">{scheme.skipped}</span>
	{$t('Unanswered')}
	{#if showPartial && partialSummary}
		<span class="mx-1 opacity-40">·</span>
		{$t('Partial')}
		<span class="text-success font-medium">{partialSummary}</span>
		{$t('if no wrong option is selected')}
	{/if}
</p>
