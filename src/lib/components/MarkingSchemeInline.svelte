<script lang="ts">
	import type { TMarks, question_type_enum } from '$lib/types';
	import { t } from 'svelte-i18n';

	/**
	 * A one-line summary of a marking scheme, for section headers.
	 *
	 * MarkingSchemeContent is a stacked key/value list sized for the per-question
	 * popover, where it is the only thing on screen. In a header that stretches
	 * the full content width it reads badly — `justify-between` pushes each value
	 * far from its label, and the partial ladder turns two lines into eight.
	 */
	let {
		scheme,
		questionType = undefined
	}: {
		scheme: TMarks;
		questionType?: question_type_enum;
	} = $props();

	const showPartial = $derived(
		!!scheme.partial?.correct_answers?.length &&
			(questionType === undefined || questionType === 'multi-choice')
	);

	const wrong = $derived(scheme.wrong > 0 ? `+${scheme.wrong}` : `${scheme.wrong}`);

	// "+1 / +2 / +3" — the ladder in reading order, without naming each count.
	// The per-question popover spells out "N correct selected" for anyone who
	// wants the detail; this is the at-a-glance version.
	const partialSummary = $derived(
		(scheme.partial?.correct_answers ?? []).map((rule) => `+${rule.marks}`).join(' / ')
	);
</script>

<p class="text-muted-foreground mt-2 text-xs">
	<span class="text-success font-medium">+{scheme.correct}</span>
	{$t('correct')}
	<span class="mx-1 opacity-40">·</span>
	<span class="text-error font-medium">{wrong}</span>
	{$t('wrong')}
	<span class="mx-1 opacity-40">·</span>
	<span class="font-medium">{scheme.skipped}</span>
	{$t('skipped')}
	{#if showPartial && partialSummary}
		<span class="mx-1 opacity-40">·</span>
		{$t('partial')}
		<span class="text-success font-medium">{partialSummary}</span>
		{$t('if no wrong option is selected')}
	{/if}
</p>
