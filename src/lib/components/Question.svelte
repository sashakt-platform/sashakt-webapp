<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { answeredAllMandatory, answeredCurrentMandatory } from '$lib/helpers/testFunctionalities';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import type { TQuestion } from '$lib/types';

	let { candidate, testQuestions } = $props();
	const questions: TQuestion[] = testQuestions.question_revisions;
	const totalQuestions = questions.length;
	const perPage = testQuestions.question_pagination || totalQuestions;

	const sessionStore = createTestSessionStore(candidate);
	let selectedQuestions = $state(sessionStore.current.selections);

	// set paginiation related properties
	let paginationPage = $state(sessionStore.current.currentPage || 1);
	let paginationReady = $state(false);

	// sync page number to localStorage when page changes
	// using snapshot to avoid unnecessary updates and prevent looping issue
	$effect(() => {
		const currentStoredPage = $state.snapshot(sessionStore.current).currentPage;
		if (paginationPage !== currentStoredPage) {
			sessionStore.current.currentPage = paginationPage;
		}
	});

	// delay pagination rendering to ensure correcy page number is set
	// setTimeout is used to prevent the component from rendering before the page number is set
	$effect(() => {
		const timer = setTimeout(() => {
			paginationReady = true;
		}, 10);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		// clear the localStorage on un-mount of the component, which takes place
		// only if the test is submitted successfully
		return () => localStorage.removeItem(`sashakt-session-${candidate.candidate_test_id}`);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'instant' });
	}
</script>

{#snippet mandatoryQuestionDialog(lastPage: boolean)}
	<Dialog.Content class="w-80 rounded-xl">
		<Dialog.Title class="mt-4">Answer all mandatory questions!</Dialog.Title>
		<Dialog.Description class="text-center"
			>Please make sure all mandatory questions are answered
			{#if !lastPage}
				before proceeding to the next page
			{:else}
				before submitting the test
			{/if}.
		</Dialog.Description>

		<Dialog.Close><Button class="mt-2 w-full">Okay</Button></Dialog.Close>
	</Dialog.Content>
{/snippet}

{#if paginationReady}
	<Pagination.Root count={totalQuestions} {perPage} bind:page={paginationPage}>
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
				<Pagination.PrevButton onclick={scrollToTop} />

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
									<Dialog.Close><Button variant="outline" class="w-32">Cancel</Button></Dialog.Close
									>
									<form action="?/submitTest" method="POST" use:enhance>
										<input
											type="hidden"
											name="selectedQuestions"
											value={JSON.stringify(selectedQuestions)}
										/>
										<Button type="submit" class="w-32">Confirm</Button>
									</form>
								</div>
							</Dialog.Content>
						{:else}
							{@render mandatoryQuestionDialog(true)}
						{/if}
					</Dialog.Root>
				{:else if !answeredCurrentMandatory(paginationPage, perPage, selectedQuestions, questions)}
					<Dialog.Root>
						<Dialog.Trigger>
							<Pagination.NextButton
								onclick={(e) => {
									e.preventDefault();
								}}
							/>
						</Dialog.Trigger>
						{@render mandatoryQuestionDialog(false)}
					</Dialog.Root>
				{:else}
					<Pagination.NextButton onclick={scrollToTop} />
				{/if}
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
{/if}
