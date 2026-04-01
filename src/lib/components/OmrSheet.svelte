<script lang="ts">
	import { page } from '$app/state';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import SubmitDialog from '$lib/components/SubmitDialog.svelte';
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
		<SubmitDialog
			bind:open={submitDialogOpen}
			isSubmitting={isSubmittingTest}
			{submitError}
			answeredAllMandatory={answeredAllMandatory(selections, questions)}
			formEnhance={handleSubmitTestEnhance}
		/>
	</div>
</div>
