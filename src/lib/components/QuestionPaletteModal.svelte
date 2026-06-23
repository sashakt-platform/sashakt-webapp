<script lang="ts">
	import BottomSheetModal from './BottomSheetModal.svelte';
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
	import type { TQuestion, TQuestionSetCandidate, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		open = $bindable(false),
		questions,
		questionSets = [],
		selections,
		currentQuestionIndex,
		onNavigate,
		showMarkForReview = true
	}: {
		open: boolean;
		questions: TQuestion[];
		questionSets?: TQuestionSetCandidate[];
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

<BottomSheetModal bind:open title={$t('Question Palette')}>
	<QuestionPaletteContent
		{questions}
		{questionSets}
		{selections}
		{currentQuestionIndex}
		onNavigate={handleQuestionClick}
		cols={6}
		gridPadding="py-6 px-4"
		{showMarkForReview}
	/>
</BottomSheetModal>
