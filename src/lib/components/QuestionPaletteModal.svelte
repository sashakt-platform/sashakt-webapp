<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
	import type { TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		open = $bindable(false),
		questions,
		selections,
		currentQuestionIndex,
		onNavigate,
		showMarkForReview = true
	}: {
		open: boolean;
		questions: TQuestion[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
		showMarkForReview?: boolean;
	} = $props();

	function handleQuestionClick(index: number) {
		onNavigate(index);
		open = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') open = false;
	}}
/>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end" role="presentation">
		<button
			type="button"
			class="bg-background/80 absolute inset-0 backdrop-blur-sm"
			onclick={() => (open = false)}
			aria-label={$t('Close')}
			tabindex="-1"
		></button>

		<div
			role="dialog"
			aria-modal="true"
			aria-label={$t('Question Palette')}
			class="bg-card relative flex max-h-[85vh] w-full flex-col rounded-t-2xl shadow-xl"
		>
			<div class="bg-muted flex items-center justify-between rounded-t-2xl px-4 py-5">
				<h2 class="text-foreground text-base font-semibold">{$t('Question Palette')}</h2>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground"
					onclick={() => (open = false)}
					aria-label={$t('Close')}
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="overflow-y-auto">
				<QuestionPaletteContent
					{questions}
					{selections}
					{currentQuestionIndex}
					onNavigate={handleQuestionClick}
					cols={6}
					gridPadding="py-6 px-4"
					{showMarkForReview}
				/>
			</div>
		</div>
	</div>
{/if}
