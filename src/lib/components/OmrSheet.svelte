<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { normalizeTestQuestions } from '$lib/helpers/questionSetHelpers';
	import { answeredAllMandatory } from '$lib/helpers/testFunctionalities';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseMatrixResponse } from '$lib/helpers/matrixHelpers';
	import {
		question_type_enum,
		type TCandidate,
		type TMatrixOptions,
		type TQuestion,
		type TSelection
	} from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		candidate,
		testDetails: _testDetails,
		testQuestions
	}: { candidate: TCandidate; testDetails: any; testQuestions: any } = $props();

	const questions: TQuestion[] = normalizeTestQuestions(testQuestions).questions;
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

	const getSelectedOptionIds = (questionId: number): number[] => {
		const sel = selections.find((s) => s.question_revision_id === questionId);
		const resp = sel?.response;
		return Array.isArray(resp) ? resp : [];
	};

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

	const getMatrixResponseForQuestion = (questionId: number): Record<string, number> =>
		parseMatrixResponse(selections.find((s) => s.question_revision_id === questionId)?.response);

	const getMatrixSelection = (questionId: number, rowId: number): number | undefined =>
		getMatrixResponseForQuestion(questionId)[String(rowId)];

	const handleMatrixSelection = async (question: TQuestion, rowId: number, columnId: number) => {
		if (submittingQuestion === question.id) return;

		const current = getMatrixResponseForQuestion(question.id);
		const newResponse = JSON.stringify({ ...current, [rowId]: columnId });

		const previousSelections = JSON.parse(JSON.stringify(selections));
		submittingQuestion = question.id;

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
		} catch {
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };
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
		} catch {
			matrixSelections = previousMatrixSelections;
			selections = previousSelections;
			sessionStore.current = { ...sessionStore.current, selections: [...previousSelections] };
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

	<div class="mx-auto flex max-w-4xl flex-col gap-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
		{#each questions as question, i (question.id)}
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
							<Button
								size="sm"
								onclick={() => handleSubjectiveSubmit(question)}
								disabled={submittingQuestion === question.id ||
									!String(currentInput).trim() ||
									!hasUnsavedChanges}
							>
								{#if !hasUnsavedChanges && hasSavedBefore}
									<Check class="mr-1 h-4 w-4" />{$t('Saved')}
								{:else if hasSavedBefore}
									{$t('Update Answer')}
								{:else}
									{$t('Save Answer')}
								{/if}
							</Button>
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
									class="ml-2 data-[state=checked]:bg-transparent data-[state=checked]:text-current sm:ml-3"
									checked={isSelected(question.id, option.id)}
									onCheckedChange={async (check) => {
										await handleSelect(question, option.id, check === false);
									}}
								/>
							</Label>
						{/each}
					</div>
				{:else if question_type === question_type_enum.SINGLE}
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
				{:else if question_type === question_type_enum.MATRIXRATING}
					{@const matrixOpts = question.options as unknown as TMatrixOptions}
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-xs sm:text-sm">
							<thead>
								<tr>
									<th class="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold">
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
