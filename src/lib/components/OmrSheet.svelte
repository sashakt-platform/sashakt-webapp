<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { canAttemptAllQuestions, normalizeTestQuestions } from '$lib/helpers/questionSetHelpers';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { question_type_enum, type TCandidate, type TQuestion, type TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';
	import RichText from './RichText.svelte';
	import ChoiceAnswer from './answer/ChoiceAnswer.svelte';
	import SubjectiveAnswer from './answer/SubjectiveAnswer.svelte';
	import NumericalAnswer from './answer/NumericalAnswer.svelte';
	import MatrixRatingAnswer from './answer/MatrixRatingAnswer.svelte';
	import MatrixMatchAnswer from './answer/MatrixMatchAnswer.svelte';
	import MatrixInputAnswer from './answer/MatrixInputAnswer.svelte';

	let {
		candidate,
		testDetails: _testDetails,
		testQuestions
	}: { candidate: TCandidate; testDetails: any; testQuestions: any } = $props();

	const normalizedQuestionData = $derived(normalizeTestQuestions(testQuestions));
	const questions: TQuestion[] = $derived(normalizedQuestionData.questions);
	const sectionByQuestionId = $derived(normalizedQuestionData.sectionByQuestionId);
	const sessionStore = createTestSessionStore(candidate);
	let selections = $state<TSelection[]>(sessionStore.current.selections);
	let submittingQuestion = $state<number | null>(null);

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

<div class="min-h-screen bg-muted p-4 pb-20 lg:p-6 lg:pb-20">
	<h1 class="mb-6 text-center text-xl font-semibold text-foreground">{$t('OMR Sheet')}</h1>

	<div class="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl bg-card p-4 shadow-sm sm:p-6">
		{#each questions as question, i (question.id)}
			{@const section = sectionByQuestionId.get(question.id) ?? null}
			{#if section && i === 0}
				<div class="bg-section-header rounded-2xl border p-4">
					<p class="text-card-foreground text-sm font-semibold">{section.title}</p>
					{#if section.description}
						<RichText content={section.description} class="text-muted-foreground mt-1 text-sm" />
					{/if}
					<p class="text-muted-foreground mt-2 text-sm">
						{#if canAttemptAllQuestions(section.max_questions_allowed_to_attempt, section.question_revisions.length)}
							{$t('You may attempt all questions in this section.')}
						{:else}
							{$t('You may attempt up to {count} questions in this section.', {
								values: { count: section.max_questions_allowed_to_attempt }
							})}
						{/if}
					</p>
				</div>
			{:else if section}
				{@const previousQuestion = questions[i - 1]}
				{@const previousSection = previousQuestion
					? (sectionByQuestionId.get(previousQuestion.id) ?? null)
					: null}
				{#if previousSection?.id !== section.id}
					<div class="bg-section-header rounded-2xl border p-4">
						<p class="text-card-foreground text-sm font-semibold">{section.title}</p>
						{#if section.description}
							<RichText content={section.description} class="text-muted-foreground mt-1 text-sm" />
						{/if}
						<p class="text-muted-foreground mt-2 text-sm">
							{#if canAttemptAllQuestions(section.max_questions_allowed_to_attempt, section.question_revisions.length)}
								{$t('You may attempt all questions in this section.')}
							{:else}
								{$t('You may attempt up to {count} questions in this section.', {
									values: { count: section.max_questions_allowed_to_attempt }
								})}
							{/if}
						</p>
					</div>
				{/if}
			{/if}
			{@const question_type = question.question_type}
			<div
				class="flex items-center gap-6 sm:gap-10 {submittingQuestion === question.id
					? 'pointer-events-none'
					: ''}"
			>
				<div class="flex items-center gap-1.5">
					<Spinner class={submittingQuestion === question.id ? '' : 'invisible'} />
					<div class="flex min-w-12 items-center justify-end gap-0.5 sm:min-w-16">
						<span class="text-foreground text-sm font-medium sm:text-lg">Q.{i + 1}:</span>
						<span
							class="text-destructive text-sm leading-none font-bold sm:text-lg {question.is_mandatory
								? ''
								: 'invisible'}">*</span
						>
					</div>
				</div>

				{#if question_type === question_type_enum.SUBJECTIVE}
					<SubjectiveAnswer
						{question}
						{candidate}
						bind:selections
						variant="omr"
						bind:isSubmitting={
							() => submittingQuestion === question.id,
							(v) => (submittingQuestion = v ? question.id : null)
						}
					/>
				{:else if question_type === question_type_enum.NUMERICALINTEGER || question_type === question_type_enum.NUMERICALDECIMAL}
					<NumericalAnswer
						{question}
						{candidate}
						bind:selections
						variant="omr"
						bind:isSubmitting={
							() => submittingQuestion === question.id,
							(v) => (submittingQuestion = v ? question.id : null)
						}
					/>
				{:else if question_type === question_type_enum.MULTIPLE || question_type === question_type_enum.SINGLE}
					<ChoiceAnswer
						{question}
						{candidate}
						bind:selections
						variant="omr"
						bind:isSubmitting={
							() => submittingQuestion === question.id,
							(v) => (submittingQuestion = v ? question.id : null)
						}
					/>
				{:else if question_type === question_type_enum.MATRIXRATING}
					<MatrixRatingAnswer
						{question}
						{candidate}
						bind:selections
						variant="omr"
						bind:isSubmitting={
							() => submittingQuestion === question.id,
							(v) => (submittingQuestion = v ? question.id : null)
						}
					/>
				{:else if question_type === question_type_enum.MATRIXMATCH}
					<MatrixMatchAnswer
						{question}
						{candidate}
						bind:selections
						variant="omr"
						bind:isSubmitting={
							() => submittingQuestion === question.id,
							(v) => (submittingQuestion = v ? question.id : null)
						}
					/>
				{:else if question_type === question_type_enum.MATRIXINPUT}
					<MatrixInputAnswer
						{question}
						{candidate}
						bind:selections
						variant="omr"
						bind:isSubmitting={
							() => submittingQuestion === question.id,
							(v) => (submittingQuestion = v ? question.id : null)
						}
					/>
				{/if}
			</div>
		{/each}
	</div>

	<div
		class="border-border bg-card fixed inset-x-0 bottom-0 z-10 flex w-full items-center justify-between border-t p-2 shadow-md lg:rounded-xl"
	>
		<div></div>
		<Dialog.Root bind:open={submitDialogOpen}>
			<Dialog.Trigger>
				<Button class="w-24">{$t('Submit')}</Button>
			</Dialog.Trigger>
			{#if answeredAllMandatory(selections, questions)}
				<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-100">
					<div class="bg-muted px-6 pt-6 pr-12 pb-4">
						<Dialog.Title class="text-xl font-bold">
							{#if submitError || page.form?.submitTest === false || page.form?.error}
								{$t('Submission Failed')}
							{:else}
								{$t('Submit test?')}
							{/if}
						</Dialog.Title>
					</div>

					<div class="border-border border-t"></div>

					<div class="bg-card px-6 py-6">
						<Dialog.Description>
							{#if submitError || page.form?.submitTest === false || page.form?.error}
								<div class="space-y-2">
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
								</div>
							{:else}
								<p class="text-muted-foreground text-sm">
									{$t(
										'Are you sure you want to submit for final marking? No changes will be allowed after submission.'
									)}
								</p>
							{/if}
						</Dialog.Description>
					</div>

					<div class="bg-card flex justify-end gap-3 px-6 pb-6">
						<Dialog.Close class="flex-1 sm:flex-none">
							<Button
								variant="outline"
								class="w-full border-primary text-primary hover:text-primary"
								disabled={isSubmittingTest}
							>
								{$t('Cancel')}
							</Button>
						</Dialog.Close>
						<form
							class="flex-1 sm:flex-none"
							action="?/submitTest"
							method="POST"
							use:enhance={handleSubmitTestEnhance}
						>
							<Button type="submit" class="w-full" disabled={isSubmittingTest}>
								{#if isSubmittingTest}
									<Spinner />
								{/if}
								{$t('Confirm')}
							</Button>
						</form>
					</div>
				</Dialog.Content>
			{:else}
				<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-100">
					<div class="bg-muted px-6 pt-6 pr-12 pb-4">
						<Dialog.Title class="text-base font-semibold"
							>{$t('Answer all mandatory questions!')}</Dialog.Title
						>
					</div>

					<div class="border-border border-t"></div>

					<div class="bg-card px-6 py-6">
						<Dialog.Description>
							<p class="text-muted-foreground text-sm">
								{$t('Please make sure all mandatory questions are answered')}
								{$t('before submitting the test')}.
							</p>
						</Dialog.Description>
					</div>

					<div class="bg-card flex justify-end px-6 pb-6">
						<Dialog.Close><Button>{$t('Okay')}</Button></Dialog.Close>
					</div>
				</Dialog.Content>
			{/if}
		</Dialog.Root>
	</div>
</div>
