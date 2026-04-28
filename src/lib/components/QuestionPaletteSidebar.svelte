<script lang="ts">
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
	import type { TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		questions,
		selections,
		currentQuestionIndex,
		onNavigate,
		showMarkForReview = true
	}: {
		questions: TQuestion[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
		showMarkForReview?: boolean;
	} = $props();
</script>

<div
	class="bg-card border-border flex max-h-full flex-col overflow-hidden rounded-xl border-r shadow-sm"
>
	<div class="flex h-16 items-center px-5" style="background: hsl(var(--section-header-bg));">
		<h2 class="text-foreground text-sm font-semibold tracking-wide uppercase">
			{$t('Question Palette')}
		</h2>
	</div>

	<div class="overflow-y-auto">
		<QuestionPaletteContent
			{questions}
			{selections}
			{currentQuestionIndex}
			{onNavigate}
			cols={5}
			gridPadding="p-5"
			{showMarkForReview}
		/>
	</div>
</div>
