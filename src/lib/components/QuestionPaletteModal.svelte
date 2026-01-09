<script lang="ts">
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		countQuestionStatuses,
		isQuestionAnswered,
		isQuestionBookmarked
	} from '$lib/helpers/questionPaletteHelpers';
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

	const stats = $derived(countQuestionStatuses(questions, selections));

	function handleQuestionClick(index: number) {
		onNavigate(index);
		open = false;
	}

	function getGridItemClasses(index: number, questionId: number): string {
		const baseClasses =
			'relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium cursor-pointer transition-colors';

		if (index === currentQuestionIndex) {
			return `${baseClasses} border-2 border-blue-500 bg-white text-blue-500`;
		}

		if (isQuestionAnswered(questionId, selections)) {
			return `${baseClasses} bg-blue-100 text-blue-700`;
		}

		return `${baseClasses} border border-gray-300 bg-white text-gray-500`;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[80vh] w-[90vw] max-w-md overflow-hidden rounded-xl p-0">
		<Dialog.Title class="sr-only">Question Palette</Dialog.Title>

		<div class="flex border-b">
			<button
				type="button"
				class="flex-1 px-4 py-3 text-center text-sm font-medium transition-colors {activeTab ===
				'palette'
					? 'border-b-2 border-blue-500 text-blue-600'
					: 'text-gray-500 hover:text-gray-700'}"
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
				onclick={() => (activeTab = 'instructions')}
			>
				Instructions
			</button>
		</div>

		<div class="max-h-[calc(80vh-48px)] overflow-y-auto p-4">
			{#if activeTab === 'palette'}
				<div class="mb-4 grid grid-cols-2 gap-3">
					<div class="flex items-center gap-2">
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700"
						>
							{stats.answered}
						</span>
						<span class="text-sm text-gray-600">Answered</span>
					</div>

					<div class="flex items-center gap-2">
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700"
						>
							{stats.bookmarked}
						</span>
						<span class="text-sm text-gray-600">Marked for review</span>
					</div>

					<div class="flex items-center gap-2">
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-medium text-red-700"
						>
							{stats.mandatory}
						</span>
						<span class="text-sm text-gray-600">Mandatory</span>
					</div>
				</div>

				<hr class="my-4" />

				<div class="grid grid-cols-5 gap-3">
					{#each questions as question, index (question.id)}
						<button
							type="button"
							class={getGridItemClasses(index, question.id)}
							onclick={() => handleQuestionClick(index)}
							aria-label="Go to question {index + 1}"
						>
							{index + 1}
							{#if question.is_mandatory}
								<span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"></span>
							{/if}
							{#if isQuestionBookmarked(question.id, selections)}
								<Bookmark
									class="absolute -right-1 -bottom-1 h-3 w-3 fill-amber-500 text-amber-500"
								/>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<div class="prose prose-sm max-w-none">
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
