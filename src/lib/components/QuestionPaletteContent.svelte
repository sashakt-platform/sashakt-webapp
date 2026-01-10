<script lang="ts">
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import {
		countQuestionStatuses,
		isQuestionAnswered,
		isQuestionBookmarked
	} from '$lib/helpers/questionPaletteHelpers';
	import type { TQuestion, TSelection } from '$lib/types';

	let {
		questions,
		selections,
		currentQuestionIndex,
		onNavigate
	}: {
		questions: TQuestion[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
	} = $props();

	const stats = $derived(countQuestionStatuses(questions, selections));

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

<!-- Stats Legend -->
<div class="mb-4 grid grid-cols-2 gap-3">
	<div class="flex items-center gap-2">
		<span
			class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700"
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
			class="flex h-8 w-8 items-center justify-center rounded-full bg-red-500"
			aria-label="Mandatory question indicator"
		>
		</span>
		<span class="text-sm text-gray-600">Mandatory</span>
	</div>
</div>

<!-- Question Grid -->
<div class="grid grid-cols-5 gap-2">
	{#each questions as question, index (question.id)}
		<button
			type="button"
			class={getGridItemClasses(index, question.id)}
			onclick={() => onNavigate(index)}
			aria-label="Go to question {index + 1}"
		>
			{index + 1}
			{#if question.is_mandatory}
				<span class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"></span>
			{/if}
			{#if isQuestionBookmarked(question.id, selections)}
				<Bookmark class="absolute -right-1 -bottom-1 h-3 w-3 fill-amber-500 text-amber-500" />
			{/if}
		</button>
	{/each}
</div>
