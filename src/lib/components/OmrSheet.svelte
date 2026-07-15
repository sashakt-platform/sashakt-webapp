<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import Check from '@lucide/svelte/icons/check';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { canAttemptAllQuestions, normalizeTestQuestions } from '$lib/helpers/questionSetHelpers';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseJsonRecord, normalizeMatrixInputValues } from '$lib/helpers/matrixHelpers';
	import {
		question_type_enum,
		type TCandidate,
		type TMatrixInputOptions,
		type TMatrixOptions,
		type TQuestion,
		type TSelection
	} from '$lib/types';
	import { t } from 'svelte-i18n';
	import RichText from './RichText.svelte';
	import ChoiceAnswer from './answer/ChoiceAnswer.svelte';
	import SubjectiveAnswer from './answer/SubjectiveAnswer.svelte';
	import NumericalAnswer from './answer/NumericalAnswer.svelte';
	import MatrixRatingAnswer from './answer/MatrixRatingAnswer.svelte';

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
	let questionErrors = $state<Record<number, string>>({});

	let isSubmittingTest = $state(false);
	let submitDialogOpen = $state(false);
	let submitError = $state<string | null>(null);
	let saveStatuses = $state<Record<number, 'idle' | 'pending' | 'saving' | 'saved'>>({});
	const debounceTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {};
	const flushFns: Record<number, (() => void) | undefined> = {};

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

	const getExistingMatrixSelections = (questionId: number): Record<string, number[]> => {
		const sel = selections.find((s) => s.question_revision_id === questionId);
		if (typeof sel?.response === 'string' && sel.response) {
			try {
				const parsed = JSON.parse(sel.response) as Record<string, number | number[]>;
				return Object.fromEntries(
					Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
				);
			} catch {
				return {};
			}
		}
		return {};
	};

	let matrixSelections = $state<Record<number, Record<string, number[]>>>(
		Object.fromEntries(
			questions
				.filter((q) => q.question_type === question_type_enum.MATRIXMATCH)
				.map((q) => [q.id, getExistingMatrixSelections(q.id)])
		)
	);

	let matrixInputValues = $state<Record<number, Record<string, string>>>(
		Object.fromEntries(
			questions
				.filter((q) => q.question_type === question_type_enum.MATRIXINPUT)
				.map((q) => [
					q.id,
					parseJsonRecord<string>(selections.find((s) => s.question_revision_id === q.id)?.response)
				])
		)
	);

	const hasAttemptedResponse = (response: number[] | string | undefined): boolean => {
		if (typeof response === 'string') {
			return response.trim().length > 0;
		}

		return (response?.length ?? 0) > 0;
	};

	const clearQuestionError = (questionId: number) => {
		if (!(questionId in questionErrors)) return;
		const { [questionId]: __removed, ...rest } = questionErrors;
		questionErrors = rest;
	};

	const setQuestionError = (questionId: number, message: string) => {
		questionErrors = { ...questionErrors, [questionId]: message };
	};

	const submitAnswer = async (questionId: number, response: number[] | string) => {
		const hasResponse = Array.isArray(response) ? response.length > 0 : response.trim().length > 0;
		const data = {
			question_revision_id: questionId,
			response: hasResponse ? response : null,
			candidate
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

	const updateSelections = (questionId: number, newResponse: number[] | string) => {
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
					bookmarked: false,
					is_reviewed: false
				}
			];
		}
		sessionStore.current = { ...sessionStore.current, selections: [...selections] };
	};

	const handleMatrixSelect = async (question: TQuestion, rowKey: string, colId: number) => {
		if (submittingQuestion === question.id) return;

		const current = matrixSelections[question.id]?.[rowKey] ?? [];
		const newRowSelections = current.includes(colId)
			? current.filter((id) => id !== colId)
			: [...current, colId];

		const newQuestionSelections = {
			...matrixSelections[question.id],
			[rowKey]: newRowSelections
		};
		const serialized = JSON.stringify(newQuestionSelections);

		const previousMatrixSelections = JSON.parse(JSON.stringify(matrixSelections));
		const previousSelections = JSON.parse(JSON.stringify(selections));
		clearQuestionError(question.id);

		matrixSelections = { ...matrixSelections, [question.id]: newQuestionSelections };

		const existing = selections.find((s) => s.question_revision_id === question.id);
		if (existing) {
			selections = selections.map((s) =>
				s.question_revision_id === question.id ? { ...s, response: serialized } : s
			);
		} else {
			selections = [
				...selections,
				{
					question_revision_id: question.id,
					response: serialized,
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			];
		}
		sessionStore.current = { ...sessionStore.current, selections: [...selections] };

		submittingQuestion = question.id;
		try {
			await submitAnswer(question.id, serialized);
		} catch (error) {
			matrixSelections = previousMatrixSelections;
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };
			setQuestionError(
				question.id,
				error instanceof Error ? error.message : 'Failed to save your answer. Please try again.'
			);
		} finally {
			submittingQuestion = null;
		}
	};

	const handleMatrixInputChange = (questionId: number, rowId: number, value: string) => {
		if (submittingQuestion === questionId) return;
		matrixInputValues = {
			...matrixInputValues,
			[questionId]: { ...(matrixInputValues[questionId] ?? {}), [String(rowId)]: value }
		};
		const q = questions.find((q) => q.id === questionId);
		if (q) scheduleSave(q, () => handleMatrixInputSave(q));
	};

	const handleMatrixInputSave = async (question: TQuestion) => {
		if (submittingQuestion === question.id) return;

		const values = matrixInputValues[question.id] ?? {};
		const normalized = normalizeMatrixInputValues(values);
		const serialized = Object.keys(normalized).length > 0 ? JSON.stringify(normalized) : '';

		const previousSelections = JSON.parse(JSON.stringify(selections));
		submittingQuestion = question.id;
		saveStatuses = { ...saveStatuses, [question.id]: 'saving' };

		updateSelections(question.id, serialized);

		try {
			await submitAnswer(question.id, serialized);
			saveStatuses = { ...saveStatuses, [question.id]: 'saved' };
		} catch (error) {
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };
			saveStatuses = { ...saveStatuses, [question.id]: 'idle' };
			setQuestionError(
				question.id,
				error instanceof Error ? error.message : 'Failed to save your answer. Please try again.'
			);
		} finally {
			submittingQuestion = null;
		}
	};

	const scheduleSave = (question: TQuestion, saveFn: () => void) => {
		saveStatuses = { ...saveStatuses, [question.id]: 'pending' };
		flushFns[question.id] = saveFn;
		clearTimeout(debounceTimers[question.id]);
		debounceTimers[question.id] = setTimeout(() => saveFn(), 800);
	};

	$effect(() => {
		return () => {
			for (const [id, timer] of Object.entries(debounceTimers)) {
				const questionId = Number(id);
				if (timer !== undefined && saveStatuses[questionId] === 'pending') {
					clearTimeout(timer);
					flushFns[questionId]?.();
				}
			}
		};
	});

	const clearAnswer = async (question: TQuestion) => {
		if (submittingQuestion === question.id) return;

		const existing = selections.find((s) => s.question_revision_id === question.id);
		if (!existing || !hasAttemptedResponse(existing.response)) return;

		const previousSelections = JSON.parse(JSON.stringify(selections));
		const previousMatrixSelections = JSON.parse(JSON.stringify(matrixSelections));
		const previousMatrixInputValues = JSON.parse(JSON.stringify(matrixInputValues));
		submittingQuestion = question.id;
		clearQuestionError(question.id);

		const clearedResponse =
			question.question_type === question_type_enum.MATRIXMATCH ||
			question.question_type === question_type_enum.MATRIXINPUT
				? ''
				: [];

		selections = selections.map((selection) =>
			selection.question_revision_id === question.id
				? {
						...selection,
						response: clearedResponse,
						visited: true,
						is_reviewed: false
					}
				: selection
		);
		sessionStore.current = { ...sessionStore.current, selections: [...selections] };

		if (question.question_type === question_type_enum.MATRIXMATCH) {
			matrixSelections = { ...matrixSelections, [question.id]: {} };
		}

		if (question.question_type === question_type_enum.MATRIXINPUT) {
			matrixInputValues = { ...matrixInputValues, [question.id]: {} };
			clearTimeout(debounceTimers[question.id]);
			debounceTimers[question.id] = undefined;
			saveStatuses = { ...saveStatuses, [question.id]: 'idle' };
		}

		try {
			await submitAnswer(question.id, clearedResponse);
		} catch (error) {
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };

			if (question.question_type === question_type_enum.MATRIXMATCH) {
				matrixSelections = previousMatrixSelections;
			}

			if (question.question_type === question_type_enum.MATRIXINPUT) {
				matrixInputValues = previousMatrixInputValues;
			}

			setQuestionError(
				question.id,
				error instanceof Error ? error.message : 'Failed to clear your answer. Please try again.'
			);
		} finally {
			submittingQuestion = null;
		}
	};
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
					{@const matrix = question.options as TMatrixOptions}
					{@const matrixRows = matrix.rows.items}
					{@const matrixColumns = matrix.columns.items}
					<div class="flex w-full flex-col gap-3">
						<div class="overflow-x-auto">
							<table class="border-collapse text-sm">
								<thead>
									<tr>
										<th class="w-10 px-3 py-2"></th>
										{#each matrixColumns as col (col.id)}
											<th class="px-5 py-2 text-center font-semibold text-foreground">{col.key}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each matrixRows as row (row.id)}
										<tr>
											<td class="px-3 py-3 font-semibold text-foreground">{row.key}</td>
											{#each matrixColumns as col (col.id)}
												{@const isChecked = (
													matrixSelections[question.id]?.[String(row.id)] ?? []
												).includes(col.id)}
												<td class="px-5 py-3 text-center">
													<Checkbox
														checked={isChecked}
														onCheckedChange={async () => {
															await handleMatrixSelect(question, String(row.id), col.id);
														}}
													/>
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="flex justify-end">
							<Button
								size="sm"
								variant="outline"
								onclick={() => clearAnswer(question)}
								disabled={submittingQuestion === question.id ||
									!hasAttemptedResponse(
										selections.find((selection) => selection.question_revision_id === question.id)
											?.response
									)}
							>
								{$t('Clear answer')}
							</Button>
						</div>
					</div>
				{:else if question_type === question_type_enum.MATRIXINPUT}
					{@const matrixOpts = question.options as TMatrixInputOptions}
					{@const inputType = matrixOpts.columns.input_type}
					{@const currentValues = matrixInputValues[question.id] ?? {}}
					{@const thClass = 'border border-border bg-muted px-3 py-2 text-left font-semibold'}
					{@const tdClass = 'border border-border px-3 py-2'}
					<div class="flex w-full flex-col gap-2">
						<div class="overflow-x-auto">
							<table class="w-full border-collapse text-xs sm:text-sm">
								<thead>
									<tr>
										<th class={thClass}>{matrixOpts.rows.label}</th>
										<th class={thClass}>{matrixOpts.columns.label}</th>
									</tr>
								</thead>
								<tbody>
									{#each matrixOpts.rows.items as row (row.id)}
										<tr class="hover:bg-muted/50">
											<td class="{tdClass} font-medium">
												<span class="font-semibold">{row.key}.</span>
											</td>
											<td class={tdClass}>
												<input
													type={inputType}
													class="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
													value={currentValues[String(row.id)] ?? ''}
													disabled={submittingQuestion === question.id}
													oninput={(e) =>
														handleMatrixInputChange(
															question.id,
															row.id,
															(e.target as HTMLInputElement).value
														)}
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								{#if (saveStatuses[question.id] ?? 'idle') === 'saving'}
									<span class="text-muted-foreground flex items-center gap-1 text-xs">
										<Spinner class="size-3" />{$t('Saving...')}
									</span>
								{:else if (saveStatuses[question.id] ?? 'idle') === 'saved'}
									<span class="text-success flex items-center gap-1 text-xs">
										<Check class="size-3" />{$t('Saved')}
									</span>
								{/if}
							</div>
							<Button
								size="sm"
								variant="outline"
								onclick={() => clearAnswer(question)}
								disabled={submittingQuestion === question.id ||
									!hasAttemptedResponse(
										selections.find((selection) => selection.question_revision_id === question.id)
											?.response
									)}
							>
								{$t('Clear answer')}
							</Button>
						</div>
					</div>
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
