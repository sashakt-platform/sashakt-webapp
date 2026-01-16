<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
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
</script>

<div class="flex max-h-full flex-col rounded-xl bg-white shadow-sm">
	<div class="flex items-center justify-center gap-2 p-4 pb-2">
		<h2 class="text-sm font-semibold tracking-wide text-gray-700 uppercase">Question Palette</h2>
		<Info class="h-4 w-4 text-gray-400" />
	</div>

	<div class="overflow-y-auto p-4 pt-2">
		<QuestionPaletteContent {questions} {selections} {currentQuestionIndex} {onNavigate} />
	</div>
</div>
