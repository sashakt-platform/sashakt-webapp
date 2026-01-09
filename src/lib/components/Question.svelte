<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import InstructionsDialog from '$lib/components/InstructionsDialog.svelte';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import QuestionPaletteModal from '$lib/components/QuestionPaletteModal.svelte';
	import QuestionPaletteSidebar from '$lib/components/QuestionPaletteSidebar.svelte';
	import QuestionPaletteToggleButton from '$lib/components/QuestionPaletteToggleButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { countQuestionStatuses } from '$lib/helpers/questionPaletteHelpers';
	import { answeredAllMandatory, answeredCurrentMandatory } from '$lib/helpers/testFunctionalities';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import type { TQuestion } from '$lib/types';

	let { candidate, testQuestions, testDetails } = $props();
	let isSubmittingTest = $state(false);

	// for controlling confirmation dialog display
	let submitDialogOpen = $state(false);

	// question palette state
	let paletteOpen = $state(false);

	// track network/submission errors
	let submitError = $state<string | null>(null);

	// let's keep dialog open when we get a submission error (from server or network)
	$effect(() => {
		if (page.form?.submitTest === false || page.form?.error || submitError) {
			submitDialogOpen = true;
		}
	});

	// let's clear the error when dialog is closed or canceled
	$effect(() => {
		if (!submitDialogOpen) {
			submitError = null;
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

	// question palette derived values
	const currentQuestionIndex = $derived((paginationPage - 1) * perPage);
	const paletteStats = $derived(countQuestionStatuses(questions, selectedQuestions));

	// navigate to a specific question by index
	function navigateToQuestion(questionIndex: number) {
		const targetPage = Math.floor(questionIndex / perPage) + 1;
		paginationPage = targetPage;
		scrollToTop();
	}

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

	// enhance handler for submitTest form action
	const handleSubmitTestEnhance = createFormEnhanceHandler({
		setLoading: (loading) => (isSubmittingTest = loading),
		setError: (error) => (submitError = error),
		setDialogOpen: (open) => (submitDialogOpen = open)
	});
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
	<div class="flex min-h-screen gap-6 bg-slate-100 p-4 lg:p-6">
		<!-- Main question content -->
		<div class="flex-1 lg:pr-80">
			<Pagination.Root count={totalQuestions} {perPage} bind:page={paginationPage} class="w-full">
				{#snippet children({ currentPage, range })}
					<div class="mb-16 w-full">
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
						class="fixed bottom-0 left-0 z-10 flex w-full items-center justify-between bg-white p-2 lg:w-[calc(100%-20rem)]"
					>
						<Pagination.PrevButton onclick={scrollToTop} />

						{#if currentPage === Math.ceil(totalQuestions / perPage)}
							<Dialog.Root bind:open={submitDialogOpen}>
								<Dialog.Trigger>
									<Button class="w-24">Submit</Button>
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
												Are you sure you want to submit for final marking? No changes will be
												allowed after submission.
											{/if}
										</Dialog.Description>
										<div class="mt-2 inline-flex items-center justify-between">
											<Dialog.Close
												><Button variant="outline" class="w-32" disabled={isSubmittingTest}
													>Cancel</Button
												></Dialog.Close
											>
											<form
												action="?/submitTest"
												method="POST"
												use:enhance={handleSubmitTestEnhance}
											>
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
										class="w-24"
										onclick={(e) => {
											e.preventDefault();
										}}
									/>
								</Dialog.Trigger>
								{@render mandatoryQuestionDialog(false)}
							</Dialog.Root>
						{:else}
							<Pagination.NextButton onclick={scrollToTop} class="w-24" />
						{/if}
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>

		<!-- Desktop sidebar - hidden on mobile -->
		<div class="fixed top-26 right-6 hidden max-h-[calc(100vh-8rem)] w-72 lg:block">
			<QuestionPaletteSidebar
				{questions}
				selections={selectedQuestions}
				{currentQuestionIndex}
				onNavigate={navigateToQuestion}
			/>
		</div>
	</div>

	<!-- Desktop Instructions button - hidden on mobile -->
	<div class="fixed top-4 right-32 z-50 hidden lg:block">
		<InstructionsDialog instructions={testDetails?.start_instructions} />
	</div>

	<!-- Mobile toggle button - hidden on desktop -->
	<div class="lg:hidden">
		<QuestionPaletteToggleButton
			remainingMandatoryCount={paletteStats.remainingMandatory}
			onclick={() => (paletteOpen = true)}
		/>
	</div>

	<!-- Mobile modal -->
	<QuestionPaletteModal
		bind:open={paletteOpen}
		{questions}
		selections={selectedQuestions}
		{currentQuestionIndex}
		instructions={testDetails?.start_instructions}
		{perPage}
		onNavigate={navigateToQuestion}
	/>
{/if}
