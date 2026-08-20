<script lang="ts">
	import { t } from 'svelte-i18n';
	import { cn } from '$lib/utils';
	import { getPartialMarks, type TQuestionResult } from '$lib/helpers/feedbackHelpers';
	import type { TMarks } from '$lib/types';

	let {
		result,
		scheme,
		correctSelected = null
	}: {
		result: TQuestionResult | null | undefined;
		scheme: TMarks;
		/**
		 * How many correct answers were selected. Required to report the marks a
		 * partially correct answer earned, since the scheme awards a different
		 * amount per count.
		 */
		correctSelected?: number | null;
	} = $props();

	const partialMarks = $derived(
		result === 'partially-correct' && correctSelected != null
			? getPartialMarks(scheme, correctSelected)
			: null
	);

	const variantClass = $derived(
		result === 'correct'
			? 'bg-success-subtle text-success'
			: result === 'partially-correct'
				? // Partial credit is still credit, so it reads as success — the ring
					// and the label distinguish it from a fully correct answer. (Adding a
					// fourth semantic colour would be a design decision; the palette
					// currently defines only success, error and warning.)
					'bg-success-subtle text-success ring-success/40 ring-1 ring-inset'
				: result === 'incorrect'
					? 'bg-error-subtle text-error'
					: result === 'unattempted'
						? 'bg-muted text-muted-foreground'
						: null
	);

	const marks = (value: number) =>
		`${value > 0 ? '+' : ''}${value} ${Math.abs(value) === 1 ? $t('mark') : $t('marks')}`;

	const label = $derived(
		result === 'correct'
			? `${$t('Correct')}: ${marks(scheme.correct)}`
			: result === 'partially-correct'
				? // Fall back to the plain label when the caller did not say how many
					// were correct, rather than showing marks that may be wrong.
					partialMarks !== null
					? `${$t('Partially Correct')}: ${marks(partialMarks)}`
					: $t('Partially Correct')
				: result === 'incorrect'
					? `${$t('Incorrect')}: ${marks(scheme.wrong)}`
					: result === 'unattempted'
						? `${$t('Not Attempted')}: ${marks(scheme.skipped)}`
						: null
	);
</script>

{#if variantClass && label}
	<span
		class={cn(
			'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium',
			variantClass
		)}
	>
		{label}
	</span>
{/if}
