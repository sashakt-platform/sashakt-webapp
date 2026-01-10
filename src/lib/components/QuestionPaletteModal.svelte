<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
	import type { TQuestion, TSelection } from '$lib/types';

	let {
		open = $bindable(false),
		questions,
		selections,
		currentQuestionIndex,
		instructions,
		perPage,
		onNavigate
	}: {
		open: boolean;
		questions: TQuestion[];
		selections: TSelection[];
		currentQuestionIndex: number;
		instructions: string | undefined;
		perPage: number;
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
		<Dialog.Title class="sr-only">Question Palette</Dialog.Title>

		<div class="flex border-b" role="tablist" aria-label="Question palette tabs">
			<button
				type="button"
				class="flex-1 px-4 py-3 text-center text-sm font-medium transition-colors {activeTab ===
				'palette'
					? 'border-b-2 border-blue-500 text-blue-600'
					: 'text-gray-500 hover:text-gray-700'}"
				role="tab"
				aria-selected={activeTab === 'palette'}
				aria-controls="palette-panel"
				onclick={() => (activeTab = 'palette')}
			>
				Question palette
			</button>
			<button
				type="button"
				class="flex-1 px-4 py-3 text-center text-sm font-medium transition-colors {activeTab ===
				'instructions'
					? 'border-b-2 border-blue-500 text-blue-600'
					: 'text-gray-500 hover:text-gray-700'}"
				role="tab"
				aria-selected={activeTab === 'instructions'}
				aria-controls="instructions-panel"
				onclick={() => (activeTab = 'instructions')}
			>
				Instructions
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
					/>
				</div>
			{:else}
				<div id="instructions-panel" class="prose prose-sm max-w-none">
					{#if instructions}
						{@html instructions}
					{:else}
						<p class="text-muted-foreground text-center">No instructions available.</p>
					{/if}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
