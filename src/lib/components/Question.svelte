<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { answeredAllMandatory, answeredCurrentMandatory } from '$lib/helpers/testFunctionalities';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import type { TQuestion } from '$lib/types';

	let { candidate, testQuestions } = $props();
	let isSubmittingTest = $state(false);

	// for controlling confirmation dialog display
	let submitDialogOpen = $state(false);

	// track network/submission errors
	let submitError = $state<string | null>(null);

	// let's keep dialog open when we get a submission error (from server or network)
	$effect(() => {
		if (page.form?.submitTest === false || page.form?.error || submitError) {
			submitDialogOpen = true;
		}
	});

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

	// enhance handler for submit test action
	function handleSubmitTestEnhance() {
		isSubmittingTest = true;
		submitError = null;

		return async ({ result, update }: any) => {
			if (result.type === 'failure') {
				// server returned an error - let SvelteKit handle it normally
				await update();
				isSubmittingTest = false;
			} else if (result.type === 'error') {
				// network error or other error - prevent navigation
				submitError = 'Something went wrong. Please check your connection and try again.';
				submitDialogOpen = true;
				isSubmittingTest = false;
			} else {
				// success - let SvelteKit handle it normally
				await update();
				isSubmittingTest = false;
			}
		};
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
					<Dialog.Root bind:open={submitDialogOpen}>
						<Dialog.Trigger>
							<Button>Submit</Button>
						</Dialog.Trigger>
						{#if answeredAllMandatory(selectedQuestions, questions)}
							<Dialog.Content class="w-80 rounded-xl">
								<Dialog.Title>
									{#if submitError || page.form?.submitTest === false || page.form?.error}
										Submission Failed
									{:else}
										Submit test?
									{/if}
								</Dialog.Title>
								<Dialog.Description>
									{#if submitError || page.form?.submitTest === false || page.form?.error}
										<div class="text-destructive">
											{#if submitError}
												<p class="mb-2">{submitError}</p>
											{:else if page.form?.error}
												<p class="mb-2">{page.form.error}</p>
											{:else}
												<p class="mb-2">There was an issue with your previous submission.</p>
											{/if}
											<p class="text-muted-foreground">Please click Confirm again to retry.</p>
										</div>
									{:else}
										Are you sure you want to submit for final marking? No changes will be allowed
										after submission.
									{/if}
								</Dialog.Description>
								<div class="mt-2 inline-flex items-center justify-between">
									<Dialog.Close
										><Button variant="outline" class="w-32" disabled={isSubmittingTest}
											>Cancel</Button
										></Dialog.Close
									>
									<form action="?/submitTest" method="POST" use:enhance={handleSubmitTestEnhance}>
										<Button type="submit" class="w-32" disabled={isSubmittingTest}>
											{#if isSubmittingTest}
												<Spinner />
											{/if}
											Confirm
										</Button>
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
