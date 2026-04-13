<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import SaveAnswerButton from '$lib/components/SaveAnswerButton.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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
		type TOptions,
		type TQuestion,
		type TSelection
	} from '$lib/types';
	import { t } from 'svelte-i18n';
	import RichText from './RichText.svelte';

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
	const SECTION_LIMIT_ERROR_PREFIX = 'Maximum attempt limit reached for section';

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

	const getExistingText = (questionId: number): string => {
		const sel = selections.find((s) => s.question_revision_id === questionId);
		return typeof sel?.response === 'string' ? sel.response : '';
	};

	let candidateInput = $state<Record<number, string>>(
		Object.fromEntries(
			questions
				.filter(
					(q) =>
						q.question_type === question_type_enum.SUBJECTIVE ||
						q.question_type === question_type_enum.NUMERICALINTEGER ||
						q.question_type === question_type_enum.NUMERICALDECIMAL
				)
				.map((q) => [q.id, getExistingText(q.id)])
		)
	);
	let lastSavedInput = $state<Record<number, string>>({ ...candidateInput });

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
	let lastSavedMatrixInputValues = $state<Record<number, Record<string, string>>>(
		JSON.parse(JSON.stringify(matrixInputValues))
	);

	const getSelectedOptionIds = (questionId: number): number[] => {
		const sel = selections.find((s) => s.question_revision_id === questionId);
		const resp = sel?.response;
		return Array.isArray(resp) ? resp : [];
	};

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

	const isSectionLimitMessage = (message: string | null | undefined) =>
		message?.includes(SECTION_LIMIT_ERROR_PREFIX) ?? false;

	const isSelected = (questionId: number, optionId: number) => {
		return getSelectedOptionIds(questionId).includes(optionId);
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
		clearQuestionError(question.id);

		updateSelections(question.id, newResponse);

		try {
			await submitAnswer(question.id, newResponse);
		} catch (error) {
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

	const getMatrixResponseForQuestion = (questionId: number): Record<string, number> =>
		parseJsonRecord<number>(
			selections.find((s) => s.question_revision_id === questionId)?.response
		);

	const getMatrixSelection = (questionId: number, rowId: number): number | undefined =>
		getMatrixResponseForQuestion(questionId)[String(rowId)];

	const handleMatrixSelection = async (question: TQuestion, rowId: number, columnId: number) => {
		if (submittingQuestion === question.id) return;

		const current = getMatrixResponseForQuestion(question.id);
		const newResponse = JSON.stringify({ ...current, [rowId]: columnId });

		const previousSelections = JSON.parse(JSON.stringify(selections));
		submittingQuestion = question.id;
		clearQuestionError(question.id);

		const existing = selections.find((s) => s.question_revision_id === question.id);
		if (existing) {
			selections = selections.map((s) =>
				s.question_revision_id === question.id ? { ...s, response: newResponse } : s
			);
		} else {
			selections = [
				...selections,
				{
					question_revision_id: question.id,
					response: newResponse,
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			];
		}
		sessionStore.current = { ...sessionStore.current, selections: [...selections] };

		try {
			await submitAnswer(question.id, newResponse);
		} catch (error) {
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
	};

	const handleMatrixInputSave = async (question: TQuestion) => {
		if (submittingQuestion === question.id) return;

		const values = matrixInputValues[question.id] ?? {};
		const normalized = normalizeMatrixInputValues(values);
		const serialized = Object.keys(normalized).length > 0 ? JSON.stringify(normalized) : '';

		const previousSelections = JSON.parse(JSON.stringify(selections));
		submittingQuestion = question.id;

		updateSelections(question.id, serialized);

		try {
			await submitAnswer(question.id, serialized);
			lastSavedMatrixInputValues = { ...lastSavedMatrixInputValues, [question.id]: { ...values } };
		} catch (error) {
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

	const handleSubjectiveSubmit = async (question: TQuestion) => {
		if (submittingQuestion === question.id) return;

		const text = String(candidateInput[question.id] ?? '');
		const existing = selections.find((s) => s.question_revision_id === question.id);

		const previousSelections = JSON.parse(JSON.stringify(selections));
		submittingQuestion = question.id;
		clearQuestionError(question.id);

		if (existing) {
			selections = selections.map((s) =>
				s.question_revision_id === question.id ? { ...s, response: text } : s
			);
		} else {
			selections = [
				...selections,
				{
					question_revision_id: question.id,
					response: text,
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			];
		}
		sessionStore.current = { ...sessionStore.current, selections: [...selections] };

		try {
			await submitAnswer(question.id, text);
			lastSavedInput[question.id] = text;
		} catch (error) {
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

	const clearAnswer = async (question: TQuestion) => {
		if (submittingQuestion === question.id) return;

		const existing = selections.find((s) => s.question_revision_id === question.id);
		if (!existing || !hasAttemptedResponse(existing.response)) return;

		const previousSelections = JSON.parse(JSON.stringify(selections));
		const previousMatrixSelections = JSON.parse(JSON.stringify(matrixSelections));
		const previousMatrixInputValues = JSON.parse(JSON.stringify(matrixInputValues));
		const previousLastSavedMatrixInputValues = JSON.parse(JSON.stringify(lastSavedMatrixInputValues));
		submittingQuestion = question.id;
		clearQuestionError(question.id);

		const clearedResponse =
			question.question_type === question_type_enum.SUBJECTIVE ||
			question.question_type === question_type_enum.NUMERICALINTEGER ||
			question.question_type === question_type_enum.NUMERICALDECIMAL ||
			question.question_type === question_type_enum.MATRIXMATCH ||
			question.question_type === question_type_enum.MATRIXRATING ||
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

		if (typeof clearedResponse === 'string') {
			if (
				question.question_type === question_type_enum.SUBJECTIVE ||
				question.question_type === question_type_enum.NUMERICALINTEGER ||
				question.question_type === question_type_enum.NUMERICALDECIMAL
			) {
				candidateInput[question.id] = '';
				lastSavedInput[question.id] = '';
			}
		}

		if (question.question_type === question_type_enum.MATRIXMATCH) {
			matrixSelections = { ...matrixSelections, [question.id]: {} };
		}

		if (question.question_type === question_type_enum.MATRIXINPUT) {
			matrixInputValues = { ...matrixInputValues, [question.id]: {} };
			lastSavedMatrixInputValues = { ...lastSavedMatrixInputValues, [question.id]: {} };
		}

		try {
			await submitAnswer(question.id, clearedResponse);
		} catch (error) {
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };

			if (
				typeof clearedResponse === 'string' &&
				(question.question_type === question_type_enum.SUBJECTIVE ||
					question.question_type === question_type_enum.NUMERICALINTEGER ||
					question.question_type === question_type_enum.NUMERICALDECIMAL)
			) {
				candidateInput[question.id] = String(
					previousSelections.find(
						(selection: TSelection) => selection.question_revision_id === question.id
					)?.response ?? ''
				);
				lastSavedInput[question.id] = candidateInput[question.id];
			} else if (question.question_type === question_type_enum.MATRIXMATCH) {
				matrixSelections = previousMatrixSelections;
			}

			if (question.question_type === question_type_enum.MATRIXINPUT) {
				matrixInputValues = previousMatrixInputValues;
				lastSavedMatrixInputValues = previousLastSavedMatrixInputValues;
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

<div class="min-h-screen bg-blue-50 p-4 pb-20 lg:p-6 lg:pb-20">
	<h1 class="mb-6 text-center text-xl font-semibold text-slate-800">{$t('OMR Sheet')}</h1>

	<div class="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
		{#each questions as question, i (question.id)}
			{@const section = sectionByQuestionId.get(question.id) ?? null}
			{#if section && i === 0}
				<div class="rounded-2xl border bg-slate-50 p-4">
					<p class="text-sm font-semibold text-slate-800">{section.title}</p>
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
					<div class="rounded-2xl border bg-slate-50 p-4">
						<p class="text-sm font-semibold text-slate-800">{section.title}</p>
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
						<span class="text-sm font-medium text-slate-700 sm:text-lg">Q.{i + 1}:</span>
						<span
							class="text-sm leading-none font-bold text-red-500 sm:text-lg {question.is_mandatory
								? ''
								: 'invisible'}">*</span
						>
					</div>
				</div>

				{#if question_type === question_type_enum.SUBJECTIVE || question_type === question_type_enum.NUMERICALINTEGER || question_type === question_type_enum.NUMERICALDECIMAL}
					{@const currentInput = candidateInput[question.id] ?? ''}
					{@const savedInput = lastSavedInput[question.id] ?? ''}
					{@const hasUnsavedChanges = String(currentInput).trim() !== String(savedInput).trim()}
					{@const hasSavedBefore = String(savedInput).trim().length > 0}
					<div class="flex w-full flex-col gap-2">
						{#if questionErrors[question.id]}
							<div
								class={`rounded-lg border p-3 text-sm ${
									isSectionLimitMessage(questionErrors[question.id])
										? 'border-amber-300 bg-amber-50 text-amber-900'
										: 'border-destructive bg-destructive/10 text-destructive'
								}`}
							>
								{questionErrors[question.id]}
								{#if isSectionLimitMessage(questionErrors[question.id])}
									<p class="mt-2 text-xs text-amber-800">
										{$t('Clear another answered question in this section to attempt this one.')}
									</p>
								{/if}
							</div>
						{/if}
						{#if question_type == question_type_enum.SUBJECTIVE}
							<textarea
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-30 w-full rounded-xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								placeholder={$t('Type your answer here...')}
								bind:value={candidateInput[question.id]}
								maxlength={question.subjective_answer_limit || undefined}
							></textarea>
						{:else}
							<input
								type="number"
								step={question_type === question_type_enum.NUMERICALDECIMAL ? 'any' : '1'}
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								placeholder={$t('Type your answer here...')}
								bind:value={candidateInput[question.id]}
							/>
						{/if}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<SaveAnswerButton
									onclick={() => handleSubjectiveSubmit(question)}
									disabled={submittingQuestion === question.id || !String(currentInput).trim()}
									hasUnsaved={hasUnsavedChanges}
									hasSaved={hasSavedBefore}
								/>
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
							{#if question.subjective_answer_limit}
								{@const remaining = question.subjective_answer_limit - currentInput.length}
								<span
									class="text-sm {remaining <= 0
										? 'font-medium text-red-500'
										: 'text-muted-foreground'}"
								>
									{remaining}
									{$t('characters remaining')}
								</span>
							{/if}
						</div>
					</div>
				{:else if question_type === question_type_enum.MULTIPLE}
					{@const typedOptions = question.options as TOptions[]}
					<div class="w-full space-y-3">
						<div class="grid grid-cols-4 gap-2 sm:gap-3">
							{#each typedOptions as option (option.id)}
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
										class="ml-2 data-[state=checked]:bg-transparent data-[state=checked]:text-current sm:ml-3"
										checked={isSelected(question.id, option.id)}
										onCheckedChange={async (check) => {
											await handleSelect(question, option.id, check === false);
										}}
									/>
								</Label>
							{/each}
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
				{:else if question_type === question_type_enum.SINGLE}
					{@const typedOptions = question.options as TOptions[]}
					<div class="w-full space-y-3">
						<RadioGroup.Root
							class="grid grid-cols-4 gap-2 sm:gap-3"
							orientation="horizontal"
							onValueChange={async (optionId) => {
								await handleSelect(question, Number(optionId));
							}}
							value={getSelectedOptionIds(question.id)[0]?.toString()}
						>
							{#each typedOptions as option (option.id)}
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
				{:else if question_type === question_type_enum.MATRIXRATING}
					{@const matrixOpts = question.options as unknown as TMatrixOptions}
					<div class="w-full space-y-3">
						<div class="overflow-x-auto">
							<table class="w-full border-collapse text-xs sm:text-sm">
								<thead>
									<tr>
										<th
											class="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold"
										>
											{matrixOpts.rows.label}
										</th>
										{#each matrixOpts.columns.items as col (col.id)}
											<th
												class="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-semibold"
											>
												{col.key}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each matrixOpts.rows.items as row (row.id)}
										<tr class="hover:bg-gray-50">
											<td class="border border-gray-300 px-3 py-2 font-medium">{row.value}</td>
											{#each matrixOpts.columns.items as col (col.id)}
												<td class="border border-gray-300 px-3 py-2 text-center">
													<input
														type="radio"
														name="omr-matrix-{question.id}-row-{row.id}"
														value={col.id}
														checked={getMatrixSelection(question.id, row.id) === col.id}
														class="accent-primary h-4 w-4 cursor-pointer"
														aria-label="{row.value} – {col.key}"
														onchange={() => handleMatrixSelection(question, row.id, col.id)}
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
											<th class="px-5 py-2 text-center font-semibold text-gray-700">{col.key}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each matrixRows as row (row.id)}
										<tr>
											<td class="px-3 py-3 font-semibold text-gray-700">{row.key}</td>
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
					{@const savedValues = lastSavedMatrixInputValues[question.id] ?? {}}
					{@const normalizedCurrent = normalizeMatrixInputValues(currentValues)}
					{@const normalizedSaved = normalizeMatrixInputValues(savedValues)}
					{@const hasUnsavedChanges =
						JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedSaved)}
					{@const hasSavedBefore = Object.values(savedValues).some((v) => v.trim().length > 0)}
					{@const thClass = 'border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold'}
					{@const tdClass = 'border border-gray-300 px-3 py-2'}
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
										<tr class="hover:bg-gray-50">
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
							<SaveAnswerButton
								onclick={() => handleMatrixInputSave(question)}
								disabled={submittingQuestion === question.id}
								hasUnsaved={hasUnsavedChanges}
								hasSaved={hasSavedBefore}
							/>
							<Button
								size="sm"
								variant="outline"
								onclick={() => clearAnswer(question)}
								disabled={
									submittingQuestion === question.id ||
									!hasAttemptedResponse(
										selections.find((selection) => selection.question_revision_id === question.id)?.response
									)
								}
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
