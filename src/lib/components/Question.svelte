<script lang="ts">
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import type { TSelection } from '$lib/types';

	let selectedQuestions = $state<TSelection[]>([]);
	let { candidate, testQuestions, showResult = $bindable() } = $props();
	const questions = testQuestions.question_revisions || [];
	const totalQuestions = questions.length;
	const perPage = testQuestions.question_pagination || totalQuestions;

	const submitTest = async () => {
		try {
			const response = await fetch('/api/submit-test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ candidate })
			});

			if (response.ok) {
				// replace alert with toast
				alert('Test submitted successfully!');
			} else {
				alert('Test already submitted or submission failed');
			}

			showResult = true;
		} catch (error) {
			alert('Failed to submit test:' + error);
		}
	};
</script>

<Pagination.Root count={totalQuestions} {perPage}>
	{#snippet children({ currentPage, range })}
		<div class="mb-12">
			{#each questions.slice(range.start - 1, range.end) as question, index (question.id)}
				<QuestionCard
					{candidate}
					serialNumber={(currentPage - 1) * perPage + index + 1}
					{question}
					{totalQuestions}
					bind:selectedQuestions
				/>
			{/each}
		</div>
		<Pagination.Content
			class="fixed bottom-0 z-10 flex w-full items-center justify-between bg-white p-2"
		>
			<Pagination.PrevButton />

			{#if currentPage === Math.ceil(totalQuestions / perPage)}
				<Button onclick={submitTest}>Submit</Button>
			{:else}
				<Pagination.NextButton />
			{/if}
		</Pagination.Content>
	{/snippet}
</Pagination.Root>
