<script lang="ts">
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Pagination from '$lib/components/ui/pagination/index.js';

	type TSelection = {
		question: string;
		response: string;
	};

	let selectedQuestions = $state<TSelection[]>([]);
	let currentQuestion = $state(0);
	let { showResult = $bindable() } = $props();
	let Questions = $state([{}]);
</script>

<div class="mx-auto max-w-xl">
	<QuestionCard
		question={Questions[currentQuestion]}
		totalQuestions={Questions.length}
		bind:selectedQuestions
	/>
	<Pagination.Root
		onPageChange={(p) => (currentQuestion = p - 1)}
		count={Questions.length}
		perPage={1}
		class="fixed bottom-0 max-w-xl bg-white p-2"
	>
		{#snippet children({ currentPage })}
			<Pagination.Content class="flex w-full items-center justify-between">
				<Pagination.PrevButton />

				{#if currentPage == Questions.length}
					<Button onclick={() => (showResult = true)}>Submit</Button>
				{:else}
					<Pagination.NextButton />
				{/if}
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
</div>
