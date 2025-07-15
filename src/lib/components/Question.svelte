<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import { selections } from '$lib/stores/selectionStore.svelte';
	import type { TQuestion, TSelection } from '$lib/types';

	let { candidate, testQuestions } = $props();
	const questions: TQuestion[] = testQuestions.question_revisions;
	const totalQuestions = questions.length;
	const perPage = testQuestions.question_pagination || totalQuestions;

	let selectedQuestions = $state(selections.current);
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
				<Dialog.Root>
					<Dialog.Trigger>
						<Button>Submit</Button>
					</Dialog.Trigger>
					{#if answeredAllMandatory(selectedQuestions, questions)}
						<Dialog.Content class="w-80 rounded-xl">
							<Dialog.Title>Submit test?</Dialog.Title>
							<Dialog.Description>
								{#if page.form?.submitTest === false}
									Please try submitting again. There was an issue with your previous submission.
								{:else}
									Are you sure you want to submit for final marking? No changes will be allowed
									after submission.
								{/if}
							</Dialog.Description>
							<div class="mt-2 inline-flex items-center justify-between">
								<Dialog.Close><Button variant="outline" class="w-32">Cancel</Button></Dialog.Close>
								<form action="?/submitTest" method="POST" use:enhance>
									<Button type="submit" class="w-32">Confirm</Button>
								</form>
							</div>
						</Dialog.Content>
					{:else}
						<Dialog.Content class="w-80 rounded-xl">
							<Dialog.Title class="mt-4">Answer all mandatory questions!</Dialog.Title>
							<Dialog.Description>
								Please make sure you have answered all the mandatory questions to submit the test.
							</Dialog.Description>

							<Dialog.Close><Button class="mt-2 w-full">Okay</Button></Dialog.Close>
						</Dialog.Content>
					{/if}
				</Dialog.Root>
			{:else}
				<Pagination.NextButton />
			{/if}
		</Pagination.Content>
	{/snippet}
</Pagination.Root>
