<script lang="ts">
	import { t } from 'svelte-i18n';
	import type { TMarks } from '$lib/types';

	let {
		result,
		scheme
	}: {
		result: 'correct' | 'incorrect' | 'unattempted' | null | undefined;
		scheme: TMarks;
	} = $props();
</script>

{#if result === 'correct'}
	<span
		class="bg-success-subtle text-success inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
	>
		{$t('Correct')}: +{scheme.correct}
		{scheme.correct === 1 ? $t('mark') : $t('marks')}
	</span>
{:else if result === 'incorrect'}
	<span
		class="bg-error-subtle text-error inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
	>
		{$t('Incorrect')}: {scheme.wrong}
		{Math.abs(scheme.wrong) === 1 ? $t('mark') : $t('marks')}
	</span>
{:else if result === 'unattempted'}
	<span
		class="bg-muted text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
	>
		{$t('Not Attempted')}: 0 {$t('mark')}
	</span>
{/if}
