<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import type { TCandidate, TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		candidate,
		testDetails,
		testQuestions
	}: { candidate: TCandidate; testDetails: any; testQuestions: any } = $props();

	const questions: TQuestion[] = testQuestions.question_revisions;
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

	const getSelectedOptionIds = (questionId: number): number[] => {
		const sel = selections.find((s) => s.question_revision_id === questionId);
		return sel?.response ?? [];
	};

	const isSelected = (questionId: number, optionId: number) => {
		return getSelectedOptionIds(questionId).includes(optionId);
	};

	const submitAnswer = async (questionId: number, response: number[], bookmarked?: boolean) => {
		const data = {
			question_revision_id: questionId,
			response: response.length > 0 ? response : null,
			candidate,
			bookmarked: bookmarked ?? false
		};

		const res = await fetch(`/test/${page.params.slug}/api/submit-answer`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (!res.ok) {
			const errorData = await res.json();
			throw new Error(errorData.error || 'Failed to submit answer');
		}

		return await res.json();
	};

	const updateSelections = (questionId: number, newResponse: number[]) => {
		const existing = selections.find((s) => s.question_revision_id === questionId);
		if (existing) {
			selections = selections.map((s) =>
				s.question_revision_id === questionId ? { ...s, response: newResponse } : s
			);
		} else {
			selections = [
				...selections,
				{
					question_revision_id: questionId,
					response: newResponse,
					visited: true,
					time_spent: 0,
					bookmarked: false
				}
			];
		}
		sessionStore.current = { ...sessionStore.current, selections: [...selections] };
	};

	const handleSelect = async (question: TQuestion, optionId: number, isRemoving = false) => {
		if (submittingQuestion === question.id) return;

		const currentIds = getSelectedOptionIds(question.id);
		let newResponse: number[];

		if (question.question_type === 'single-choice') {
			if (currentIds[0] === optionId) return;
			newResponse = [optionId];
		} else {
			if (isRemoving) {
				newResponse = currentIds.filter((id) => id !== optionId);
			} else {
				newResponse = currentIds.includes(optionId) ? currentIds : [...currentIds, optionId];
			}
		}

		const previousSelections = JSON.parse(JSON.stringify(selections));
		submittingQuestion = question.id;

		updateSelections(question.id, newResponse);

		try {
			await submitAnswer(question.id, newResponse);
		} catch {
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };
		} finally {
			submittingQuestion = null;
		}
	};
</script>

<div class="min-h-screen bg-blue-50 p-4 pb-20 lg:p-6 lg:pb-20">
	<h1 class="mb-6 text-center text-xl font-semibold text-slate-800">{$t('OMR Sheet')}</h1>

	<div class="mx-auto flex max-w-4xl flex-col gap-5">
		{#each questions as question, i}
			{@const isMultiple = question.question_type === 'multiple-select'}
			<div
				class="flex items-center gap-6 sm:gap-10 {submittingQuestion === question.id
					? 'pointer-events-none opacity-60'
					: ''}"
			>
				<div class="flex min-w-12 items-center justify-end gap-0.5 sm:min-w-16">
					<span class="text-sm font-medium text-slate-700 sm:text-lg">Q.{i + 1}:</span>
					{#if question.is_mandatory}
						<span class="text-sm leading-none font-bold text-red-500 sm:text-lg">*</span>
					{/if}
				</div>

				{#if isMultiple}
					<div class="grid grid-cols-4 gap-2 sm:gap-3">
						{#each question.options as option (option.id)}
							{@const uid = `omr-${question.id}-${option.key}`}
							<Label
								for={uid}
								class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm sm:px-5 sm:py-4 sm:text-base {isSelected(
									question.id,
									option.id
								)
									? 'bg-primary text-muted *:border-muted *:text-muted'
									: ''}"
							>
								{option.key}
								<Checkbox
									id={uid}
									value={option.id.toString()}
									class="ml-2 sm:ml-3"
									checked={isSelected(question.id, option.id)}
									onCheckedChange={async (check) => {
										await handleSelect(question, option.id, check === false);
									}}
								/>
							</Label>
						{/each}
					</div>
				{:else}
					<RadioGroup.Root
						class="grid grid-cols-4 gap-2 sm:gap-3"
						orientation="horizontal"
						onValueChange={async (optionId) => {
							await handleSelect(question, Number(optionId));
						}}
						value={getSelectedOptionIds(question.id)[0]?.toString()}
					>
						{#each question.options as option (option.id)}
							{@const uid = `omr-${question.id}-${option.key}`}
							<Label
								for={uid}
								class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm sm:px-5 sm:py-4 sm:text-base {isSelected(
									question.id,
									option.id
								)
									? 'bg-primary text-muted *:border-muted *:text-muted'
									: ''}"
							>
								{option.key}
								<RadioGroup.Item value={option.id.toString()} id={uid} class="ml-2 sm:ml-3" />
							</Label>
						{/each}
					</RadioGroup.Root>
				{/if}

				{#if submittingQuestion === question.id}
					<Spinner />
				{/if}
			</div>
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
