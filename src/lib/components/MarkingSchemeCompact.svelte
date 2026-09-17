<script lang="ts">
	import { question_type_enum, type TMarks } from '$lib/types';
	import { t } from 'svelte-i18n';

	/**
	 * A marking scheme sized for a table cell -- the marks alone. The inline
	 * variant reads as prose and is too wide for a column.
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
			(questionType === undefined || questionType === question_type_enum.MULTIPLE)
	);

	const partialSummary = $derived(
		(scheme.partial?.correct_answers ?? []).map((rule) => `+${rule.marks}`).join(' / ')
	);
</script>

<span class="whitespace-nowrap">
	<span class="text-success font-medium">+{scheme.correct}</span>
	<span class="text-muted-foreground mx-0.5">/</span>
	<span class="text-error font-medium">{scheme.wrong > 0 ? `+${scheme.wrong}` : scheme.wrong}</span>
	<!-- Skipped is 0 in almost every scheme; only worth showing when it is not. -->
	{#if scheme.skipped !== 0}
		<span class="text-muted-foreground mx-0.5">/</span>
		<span class="text-warning font-medium">{scheme.skipped}</span>
	{/if}
</span>
{#if showPartial && partialSummary}
	<span class="text-muted-foreground mt-0.5 block text-xs whitespace-nowrap">
		{$t('Partial')}
		<span class="text-success font-medium">{partialSummary}</span>
	</span>
{/if}
