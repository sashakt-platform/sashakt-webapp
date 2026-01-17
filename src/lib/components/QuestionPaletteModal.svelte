<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
	import type { TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		open = $bindable(false),
		questions,
		selections,
		currentQuestionIndex,
		instructions,
		onNavigate
	}: {
		open: boolean;
		questions: TQuestion[];
		selections: TSelection[];
		currentQuestionIndex: number;
		instructions: string | undefined;
		onNavigate: (questionIndex: number) => void;
	} = $props();

	let activeTab = $state<'palette' | 'instructions'>('palette');

	function handleQuestionClick(index: number) {
		onNavigate(index);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[80vh] w-[90vw] max-w-md overflow-hidden rounded-xl p-0">
		<Dialog.Title class="sr-only">{$t('Question Palette')}</Dialog.Title>

		<div class="flex" role="tablist" aria-label={$t('Question palette tabs')}>
			<button
				type="button"
				class="flex-1 px-4 py-3 text-center text-sm transition-colors {activeTab === 'palette'
					? 'text-primary bg-blue-100 font-bold'
					: 'bg-gray-100 font-medium text-gray-500 hover:text-gray-700'}"
				role="tab"
				aria-selected={activeTab === 'palette'}
				aria-controls="palette-panel"
				onclick={() => (activeTab = 'palette')}
			>
				{$t('Question Palette')}
			</button>
			<button
				type="button"
				class="flex-1 px-4 py-3 text-center text-sm transition-colors {activeTab === 'instructions'
					? 'text-primary bg-blue-100 font-bold'
					: 'bg-gray-100 font-medium text-gray-500 hover:text-gray-700'}"
				role="tab"
				aria-selected={activeTab === 'instructions'}
				aria-controls="instructions-panel"
				onclick={() => (activeTab = 'instructions')}
			>
				{$t('Instructions')}
			</button>
		</div>

		<div class="max-h-[calc(80vh-48px)] overflow-y-auto p-4">
			{#if activeTab === 'palette'}
				<div id="palette-panel">
					<QuestionPaletteContent
						{questions}
						{selections}
						{currentQuestionIndex}
						onNavigate={handleQuestionClick}
						maxRows={5}
					/>
				</div>
			{:else}
				<div id="instructions-panel" class="prose prose-sm max-w-none">
					{#if instructions}
						{@html instructions}
					{:else}
						<p class="text-muted-foreground text-center">{$t('No instructions available.')}</p>
					{/if}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
