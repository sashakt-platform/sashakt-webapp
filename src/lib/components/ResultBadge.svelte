<script lang="ts">
	import { t } from 'svelte-i18n';
	import { cn } from '$lib/utils';
	import type { TMarks } from '$lib/types';

	let {
		result,
		scheme
	}: {
		result: 'correct' | 'incorrect' | 'unattempted' | null | undefined;
		scheme: TMarks;
	} = $props();

	const variantClass = $derived(
		result === 'correct'
			? 'bg-success-subtle text-success'
			: result === 'incorrect'
				? 'bg-error-subtle text-error'
				: result === 'unattempted'
					? 'bg-muted text-muted-foreground'
					: null
	);

	const label = $derived(
		result === 'correct'
			? `${$t('Correct')}: +${scheme.correct} ${scheme.correct === 1 ? $t('mark') : $t('marks')}`
			: result === 'incorrect'
				? `${$t('Incorrect')}: ${scheme.wrong} ${Math.abs(scheme.wrong) === 1 ? $t('mark') : $t('marks')}`
				: result === 'unattempted'
					? `${$t('Not Attempted')}: ${scheme.skipped} ${scheme.skipped === 1 ? $t('mark') : $t('marks')}`
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
