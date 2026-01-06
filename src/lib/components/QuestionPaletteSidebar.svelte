<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import { countQuestionStatuses, getQuestionStatus } from '$lib/helpers/questionPaletteHelpers';
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

	function handleQuestionClick(index: number) {
		onNavigate(index);
	}

	function getGridItemClasses(index: number, questionId: number): string {
		const baseClasses =
			'relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium cursor-pointer transition-colors';

		if (index === currentQuestionIndex) {
			return `${baseClasses} border-2 border-blue-500 bg-white text-blue-500`;
		}

		const status = getQuestionStatus(questionId, selections);

		switch (status) {
			case 'answered':
				return `${baseClasses} bg-blue-100 text-blue-700`;
			case 'skipped':
				return `${baseClasses} bg-gray-200 text-gray-600`;
			case 'not-visited':
			default:
				return `${baseClasses} border border-gray-300 bg-white text-gray-500`;
		}
	}
</script>

<div class="flex h-full flex-col rounded-xl border bg-white shadow-sm">
	<div class="flex items-center justify-center gap-2 border-b p-4">
		<h2 class="text-sm font-semibold tracking-wide text-gray-700">QUESTION PALETTE</h2>
		<Info class="h-4 w-4 text-gray-400" />
	</div>

	<div class="flex-1 overflow-y-auto p-4">
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
					class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600"
				>
					{stats.skipped}
				</span>
				<span class="text-sm text-gray-600">Skipped</span>
			</div>

			<div class="flex items-center gap-2">
				<span
					class="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-500"
				>
					{stats.notVisited}
				</span>
				<span class="text-sm text-gray-600">Not visited</span>
			</div>

			<div class="flex items-center gap-2">
				<span class="flex h-8 w-8 items-center justify-center rounded-full bg-red-500"> </span>
				<span class="text-sm text-gray-600">Mandatory</span>
			</div>
		</div>

		<div class="grid grid-cols-5 gap-2">
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
				</button>
			{/each}
		</div>
	</div>
</div>
