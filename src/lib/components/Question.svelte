<script lang="ts">
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Pagination from '$lib/components/ui/pagination/index.js';

	type TSelection = {
		question_revision_id: number;
		response: string;
		visited: boolean;
		time_spent: number;
	};

	let selectedQuestions = $state<TSelection[]>([]);
	let currentQuestion = $state(0);
	let { candidate, Questions, showResult = $bindable() } = $props();

	const handleNext = async () =>
		fetch('/api/submit-answer', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				question_revision_id: Questions[currentQuestion].id,
				response: selectedQuestions[currentQuestion]?.response || '',
				visited: true,
				time_spent: 0,
				candidate
			})
		});

	const submitTest = async () => {
		handleNext().then(() => {
			fetch('/api/submit-test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ candidate })
			})
				.then((res) => {
					alert(res.ok ? 'Test submitted successfully!' : 'Already submitted');
				})
				.then(() => {
					showResult = true;
				});
		});
	};
</script>

<div class="mx-auto max-w-xl">
	<QuestionCard
		SNo={currentQuestion + 1}
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
					<Button onclick={submitTest}>Submit</Button>
				{:else}
					<Pagination.NextButton onclick={handleNext} />
				{/if}
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
</div>
