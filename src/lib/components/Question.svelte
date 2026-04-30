<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import QuestionCard from '$lib/components/QuestionCard.svelte';
	import QuestionPaletteModal from '$lib/components/QuestionPaletteModal.svelte';
	import QuestionPaletteSidebar from '$lib/components/QuestionPaletteSidebar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { normalizeTestQuestions } from '$lib/helpers/questionSetHelpers';
	import { countQuestionStatuses } from '$lib/helpers/questionPaletteHelpers';
	import { answeredAllMandatory, answeredCurrentMandatory } from '$lib/helpers/testFunctionalities';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { navState } from '$lib/navState.svelte';
	import type { TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

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

	const questions: TQuestion[] = normalizeTestQuestions(testQuestions).questions;
	const totalQuestions = questions.length;
	const perPage = testQuestions.question_pagination || totalQuestions;

	const sessionStore = createTestSessionStore(candidate);
	let selectedQuestions = $state(sessionStore.current.selections);

	// set paginiation related properties
	let paginationPage = $state(sessionStore.current.currentPage || 1);
	let paginationReady = $state(false);

	// question palette - track which question is currently selected
	let currentQuestionIndex = $state((sessionStore.current.currentPage - 1) * perPage || 0);
	const paletteStats = $derived(countQuestionStatuses(questions, selectedQuestions));
	const markedForReviewCount = $derived(
		selectedQuestions.filter((s: TSelection) => s.bookmarked).length
	);

	$effect(() => {
		navState.active = true;
		navState.instructions = testDetails?.start_instructions;
		navState.showPalette = testDetails?.show_question_palette ?? false;
		navState.onPaletteOpen = testDetails?.show_question_palette
			? () => (paletteOpen = true)
			: undefined;
		navState.remainingMandatoryCount = paletteStats.remainingMandatory;
		return () => {
			navState.active = false;
			navState.instructions = undefined;
			navState.showPalette = false;
			navState.onPaletteOpen = undefined;
			navState.remainingMandatoryCount = 0;
		};
	});

	// navigate to a specific question by index
	function navigateToQuestion(questionIndex: number) {
		const targetPage = Math.floor(questionIndex / perPage) + 1;
		paginationPage = targetPage;
		currentQuestionIndex = questionIndex;

		// scroll to the specific question after page renders
		setTimeout(() => {
			const element = document.getElementById(`question-${questionIndex}`);
			if (element) {
				const offset = 120; // account for top banner and padding
				const elementPosition = element.getBoundingClientRect().top + window.scrollY;
				window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
			}
		}, 50);
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

	// scroll to top and update current question index when page changes
	function handlePageChange(newPage: number) {
		currentQuestionIndex = (newPage - 1) * perPage;
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
		<Dialog.Title class="mt-4">{$t('Answer all mandatory questions!')}</Dialog.Title>
		<Dialog.Description class="text-center"
			>{$t('Please make sure all mandatory questions are answered')}
			{#if !lastPage}
				{$t('before proceeding to the next page')}
			{:else}
				{$t('before submitting the test')}
			{/if}.
		</Dialog.Description>

		<Dialog.Close><Button class="mt-2 w-full">{$t('Okay')}</Button></Dialog.Close>
	</Dialog.Content>
{/snippet}

{#if paginationReady}
	<div class="bg-muted flex min-h-screen gap-6 p-4 pb-20 lg:p-6 lg:pb-20">
		<!-- Main question content -->
		<div class="flex-1 {testDetails?.show_question_palette ? 'lg:pr-80' : ''}">
			<Pagination.Root
				count={totalQuestions}
				{perPage}
				bind:page={paginationPage}
				onPageChange={handlePageChange}
				class="w-full"
			>
				{#snippet children({ currentPage, range })}
					<div class="w-full">
						{#each questions.slice(range.start - 1, range.end) as question, index (question.id)}
							<div id="question-{(currentPage - 1) * perPage + index}">
								<QuestionCard
									{candidate}
									serialNumber={(currentPage - 1) * perPage + index + 1}
									{question}
									{totalQuestions}
									bind:selectedQuestions
									showFeedback={testDetails.show_feedback_immediately}
									showMarkForReview={testDetails.bookmark}
									showMarks={testDetails?.show_marks ?? true}
								/>
							</div>
						{/each}
					</div>
					<Pagination.Content
						class="border-border bg-card fixed inset-x-0 bottom-0 z-10 grid w-full grid-cols-3 items-center border-t px-8 py-6"
					>
						<div class="flex justify-start">
							<Pagination.PrevButton />
						</div>

						<div class="flex justify-center">
							<span class="text-muted-foreground text-center text-sm font-medium">
								{$t('Page')}
								{currentPage}
								{$t('of')}
								{Math.ceil(totalQuestions / perPage)}
								&nbsp;|&nbsp;
								{range.start}–{range.end}
								{$t('of')}
								{totalQuestions}
								{$t('Questions')}
							</span>
						</div>

						<div class="flex justify-end">
							{#if currentPage === Math.ceil(totalQuestions / perPage)}
								<Dialog.Root bind:open={submitDialogOpen}>
									<Dialog.Trigger>
										<Button class="gap-1 pr-2.5">
											{$t('Submit Test')}
											<ArrowRight class="size-4" />
										</Button>
									</Dialog.Trigger>
									{#if answeredAllMandatory(selectedQuestions, questions)}
										<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-100">
											<div class="bg-card px-6 pt-6 pr-12 pb-4">
												<Dialog.Title class="text-xl font-bold">
													{#if submitError || page.form?.submitTest === false || page.form?.error}
														{$t('Submission Failed')}
													{:else}
														{$t('Submit Test?')}
													{/if}
												</Dialog.Title>
											</div>

											<div class="border-border border-t"></div>

											<div class="bg-card px-6 py-6">
												{#if submitError || page.form?.submitTest === false || page.form?.error}
													<Dialog.Description class="space-y-2">
														<p class="text-destructive text-sm font-medium">
															{#if submitError}
																{submitError}
															{:else if page.form?.error}
																{page.form.error}
															{:else}
																{$t('There was an issue with your previous submission.')}
															{/if}
														</p>
														<p class="text-muted-foreground text-sm">
															{$t('Please click Confirm again to retry.')}
														</p>
													</Dialog.Description>
												{:else}
													<Dialog.Description class="space-y-3">
														{#if markedForReviewCount > 0}
															<p class="text-warning font-semibold">
																{$t('You have {count} questions marked for review.', {
																	values: { count: markedForReviewCount }
																})}
															</p>
														{/if}
														<p class="text-muted-foreground text-sm">
															{$t(
																'No changes will be allowed once you submit the test. Are you sure you want to submit?'
															)}
														</p>
													</Dialog.Description>
												{/if}
											</div>

											<div class="bg-card flex justify-end gap-3 px-6 pb-6">
												<Dialog.Close>
													<Button variant="outline" disabled={isSubmittingTest}>
														{$t('Cancel')}
													</Button>
												</Dialog.Close>
												<form
													action="?/submitTest"
													method="POST"
													use:enhance={handleSubmitTestEnhance}
												>
													<Button type="submit" disabled={isSubmittingTest}>
														{#if isSubmittingTest}
															<Spinner />
														{/if}
														{$t('Submit')}
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
										<Button class="gap-1 pr-2.5">
											{$t('Next')}
											<ArrowRight class="size-4" />
										</Button>
									</Dialog.Trigger>
									{@render mandatoryQuestionDialog(false)}
								</Dialog.Root>
							{:else}
								<Pagination.NextButton class="w-24" />
							{/if}
						</div>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>

		<!-- Desktop sidebar - hidden on mobile -->
		{#if testDetails?.show_question_palette}
			<div class="fixed top-28 right-6 hidden max-h-[calc(100vh-8rem)] w-72 lg:block">
				<QuestionPaletteSidebar
					{questions}
					selections={selectedQuestions}
					{currentQuestionIndex}
					onNavigate={navigateToQuestion}
					showMarkForReview={testDetails.bookmark}
				/>
			</div>
		{/if}
	</div>

	{#if testDetails?.show_question_palette}
		<QuestionPaletteModal
			bind:open={paletteOpen}
			{questions}
			selections={selectedQuestions}
			{currentQuestionIndex}
			onNavigate={navigateToQuestion}
			showMarkForReview={testDetails.bookmark}
		/>
	{/if}
{/if}
