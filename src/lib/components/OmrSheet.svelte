<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { type TCandidate, type TQuestion, type TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';
	import QuestionCard from './QuestionCard.svelte';

	let {
		candidate,
		testDetails: _testDetails,
		testQuestions
	}: { candidate: TCandidate; testDetails: any; testQuestions: any } = $props();

	const questions: TQuestion[] = testQuestions.question_revisions;
	const sessionStore = createTestSessionStore(candidate);
	let selections = $state<TSelection[]>(sessionStore.current.selections);

	let isSubmittingTest = $state(false);
	let submitDialogOpen = $state(false);
	let submitError = $state<string | null>(null);

	$effect(() => {
		if (page.form?.submitTest === false || page.form?.error || submitError) {
			submitDialogOpen = true;
		}
	});

	$effect(() => {
		if (!submitDialogOpen) {
			submitError = null;
		}
	});

	$effect(() => {
		return () => localStorage.removeItem(`sashakt-session-${candidate.candidate_test_id}`);
	});

	const handleSubmitTestEnhance = createFormEnhanceHandler({
		setLoading: (loading) => (isSubmittingTest = loading),
		setError: (error) => (submitError = error),
		setDialogOpen: (open) => (submitDialogOpen = open)
	});
</script>

<div class="min-h-screen bg-blue-50 p-4 pb-20 lg:p-6 lg:pb-20">
	<h1 class="mb-6 text-center text-xl font-semibold text-slate-800">{$t('OMR Sheet')}</h1>

	<div class="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
		{#each questions as question, i (question.id)}
			<QuestionCard
				mode="omr"
				{question}
				{candidate}
				questionIndex={i}
				bind:selectedQuestions={selections}
			/>
		{/each}
	</div>

	<div
		class="fixed inset-x-0 bottom-0 z-10 flex w-full items-center justify-between bg-white p-2 shadow-md lg:rounded-xl"
	>
		<div></div>
		<Dialog.Root bind:open={submitDialogOpen}>
			<Dialog.Trigger>
				<Button class="w-24">{$t('Submit')}</Button>
			</Dialog.Trigger>
			{#if answeredAllMandatory(selections, questions)}
				<Dialog.Content class="w-80 rounded-xl">
					<Dialog.Title>
						{#if submitError || page.form?.submitTest === false || page.form?.error}
							{$t('Submission Failed')}
						{:else}
							{$t('Submit test?')}
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
									<p class="mb-2">
										{$t('There was an issue with your previous submission.')}
									</p>
								{/if}
								<p class="text-muted-foreground">
									{$t('Please click Confirm again to retry.')}
								</p>
							</div>
						{:else}
							{$t(
								'Are you sure you want to submit for final marking? No changes will be allowed after submission.'
							)}
						{/if}
					</Dialog.Description>
					<div class="mt-2 inline-flex items-center justify-between">
						<Dialog.Close>
							<Button variant="outline" class="w-32" disabled={isSubmittingTest}>
								{$t('Cancel')}
							</Button>
						</Dialog.Close>
						<form action="?/submitTest" method="POST" use:enhance={handleSubmitTestEnhance}>
							<Button type="submit" class="w-32" disabled={isSubmittingTest}>
								{#if isSubmittingTest}
									<Spinner />
								{/if}
								{$t('Confirm')}
							</Button>
						</form>
					</div>
				</Dialog.Content>
			{:else}
				<Dialog.Content class="w-80 rounded-xl">
					<Dialog.Title class="mt-4">{$t('Answer all mandatory questions!')}</Dialog.Title>
					<Dialog.Description class="text-center">
						{$t('Please make sure all mandatory questions are answered')}
						{$t('before submitting the test')}.
					</Dialog.Description>
					<Dialog.Close><Button class="mt-2 w-full">{$t('Okay')}</Button></Dialog.Close>
				</Dialog.Content>
			{/if}
		</Dialog.Root>
	</div>
</div>
