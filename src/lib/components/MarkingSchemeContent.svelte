<script lang="ts">
	import type { TMarks, question_type_enum } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		scheme,
		questionType
	}: {
		scheme: TMarks;
		questionType: question_type_enum;
	} = $props();
</script>

<div class="space-y-3">
	<div class="flex justify-between gap-4">
		<span class="text-success font-semibold">{$t('Correct')}</span>
		<span class="text-success font-semibold">+{scheme.correct}</span>
	</div>
	<div class="flex justify-between gap-4">
		<span class="text-error font-semibold">{$t('Incorrect')}</span>
		<span class="text-error font-semibold">{scheme.wrong > 0 ? `+${scheme.wrong}` : scheme.wrong}</span>
	</div>
	<div class="flex justify-between gap-4">
		<span class="text-warning font-semibold">{$t('Unanswered')}</span>
		<span class="text-warning font-semibold">{scheme.skipped}</span>
	</div>
</div>

{#if scheme.partial?.correct_answers?.length && questionType === 'multi-choice'}
	<div class="border-border mt-3 border-t pt-3">
		<p class="text-muted-foreground mb-2 text-xs leading-snug">
			{$t('Partial marks awarded if no wrong option is selected')}:
		</p>
		<div class="space-y-2">
			{#each scheme.partial.correct_answers as rule, i (i)}
				<div class="flex justify-between gap-4">
					<span class="text-success font-medium"
						>{rule.num_correct_selected} {$t('correct selected')}</span
					>
					<span class="text-success font-semibold">+{rule.marks}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
