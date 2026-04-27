<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import QuestionPaletteContent from './QuestionPaletteContent.svelte';
	import RichText from './RichText.svelte';
	import type { TQuestion, TQuestionSetCandidate, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';
	import { X } from '@lucide/svelte';

	let {
		open = $bindable(false),
		questions,
		questionSets = [],
		selections,
		currentQuestionIndex,
		instructions,
		onNavigate,
		showMarkForReview = true
	}: {
		open: boolean;
		questions: TQuestion[];
		questionSets?: TQuestionSetCandidate[];
		selections: TSelection[];
		currentQuestionIndex: number;
		onNavigate: (questionIndex: number) => void;
		instructions: string | undefined;
		showMarkForReview?: boolean;
	} = $props();

	function handleQuestionClick(index: number) {
		onNavigate(index);
		open = false;
	}
	let activeTab = $state<'palette' | 'instructions'>('palette');
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		showCloseButton={false}
		class="data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom inset-x-0 top-auto right-0 bottom-0 left-0 flex max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-t-2xl rounded-b-none border-0 p-0 sm:max-w-none"
	>
		<Dialog.Title class="sr-only">{$t('Question Palette')}</Dialog.Title>

		<div class="bg-muted flex items-center justify-between rounded-t-2xl px-4 py-5">
			<h2 class="text-foreground text-base font-semibold">{$t('Question Palette')}</h2>
			<Dialog.Close class="text-muted-foreground hover:text-foreground" aria-label={$t('Close')}>
				<X class="size-5" />
			</Dialog.Close>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto p-4">
			{#if activeTab === 'palette'}
				<div id="palette-panel">
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
			{:else}
				<div id="instructions-panel" class="prose prose-sm max-w-none">
					{#if instructions}
						<RichText content={instructions} />
					{:else}
						<p class="text-muted-foreground text-center">{$t('No instructions available.')}</p>
					{/if}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
