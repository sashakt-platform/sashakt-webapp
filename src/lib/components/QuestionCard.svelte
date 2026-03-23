<script lang="ts">
	import { page } from '$app/state';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseMatrixResponse } from '$lib/helpers/matrixHelpers';
	import {
		question_type_enum,
		type TCandidate,
		type TMatrixOptions,
		type TOptions,
		type TQuestion,
		type TSelection
	} from '$lib/types';
	import { t } from 'svelte-i18n';
	import { isNumericalAnswerCorrect } from '$lib/helpers/feedbackHelpers';
	import QuestionMedia from './QuestionMedia.svelte';

	let {
		question,
		serialNumber,
		candidate,
		totalQuestions,
		selectedQuestions = $bindable(),
		showFeedback = false,
		showMarkForReview = true
	}: {
		question: TQuestion;
		candidate: TCandidate;
		serialNumber: number;
		totalQuestions: number;
		selectedQuestions: TSelection[];
		showFeedback?: boolean;
		showMarkForReview?: boolean;
	} = $props();

	const options = question.options;

	// key to force remount of RadioGroup on error, this is to prevent radio button from being checked
	let radioGroupKey = $state(0);
	let isSubmitting = $state(false);
	let saveError = $state<string | null>(null);

	const sessionStore = createTestSessionStore(candidate);
	const selectedQuestion = (questionId: number) => {
		return selectedQuestions.find((item) => item.question_revision_id === questionId);
	};

	const currentSelection = $derived(selectedQuestion(question.id));
	const correctAnswer = $derived(currentSelection?.correct_answer ?? null);
	const hasFeedbackAvailable = $derived((currentSelection?.response?.length ?? 0) > 0);
	const isFeedbackViewed = $derived(currentSelection?.is_reviewed === true);
	const isLocked = $derived(isFeedbackViewed);

	const checkNumberAnswerCorrect = $derived(() => {
		if (!currentSelection) return null;
		if (currentSelection.response && typeof currentSelection.response !== 'string') return null;
		if (
			(currentSelection.correct_answer && typeof currentSelection.correct_answer !== 'number') ||
			currentSelection.correct_answer == undefined
		)
			return null;
		return isNumericalAnswerCorrect(
			question.question_type,
			currentSelection.response,
			currentSelection.correct_answer
		);
	});

	const getExistingInputResponse = () => {
		const selected = selectedQuestion(question.id);
		return typeof selected?.response === 'string' ? selected.response : '';
	};
	let candidateInput = $state(getExistingInputResponse());
	let lastSavedInput = $state(getExistingInputResponse());

	const getExistingMatrixSelections = () => {
		const selected = selectedQuestion(question.id);
		if (typeof selected?.response === 'string' && selected.response) {
			try {
				const parsed = JSON.parse(selected.response) as Record<string, number | number[]>;
				return Object.fromEntries(
					Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
				) as Record<string, number[]>;
			} catch {
				return {};
			}
		}
		return {};
	};
	let matrixSelections = $state<Record<string, number[]>>(getExistingMatrixSelections());

	const handleMatrixInput = async (rowKey: string | number, colId: number) => {
		if (isLocked || isSubmitting) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		const applyUpdate = (newResponse: string) => {
			if (answeredQuestion) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === question.id ? { ...q, response: newResponse } : q
				);
			} else {
				selectedQuestions = [
					...selectedQuestions,
					{
						question_revision_id: question.id,
						response: newResponse,
						visited: true,
						time_spent: 0,
						bookmarked: currentBookmarked,
						is_reviewed: false
					}
				];
			}
		};

		isSubmitting = true;
		saveError = null;

		if (question.question_type === question_type_enum.MATRIXMATCH) {
			const key = String(rowKey);
			const current = matrixSelections[key] ?? [];
			const newSelections = {
				...matrixSelections,
				[key]: current.includes(colId) ? current.filter((id) => id !== colId) : [...current, colId]
			};
			const serialized = JSON.stringify(newSelections);
			const prevSelections = { ...matrixSelections };
			const prevState = JSON.parse(JSON.stringify(selectedQuestions));

			matrixSelections = newSelections;
			applyUpdate(serialized);
			updateStore();

			try {
				await submitAnswer(question.id, serialized, currentBookmarked);
			} catch {
				matrixSelections = prevSelections;
				selectedQuestions = prevState;
				updateStore();
				saveError = 'Failed to save your answer. Please try again.';
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		} else {
			const newResponse = JSON.stringify({
				...parseMatrixResponse(answeredQuestion?.response),
				[rowKey]: colId
			});

			try {
				await submitAnswer(question.id, newResponse, currentBookmarked);
				applyUpdate(newResponse);
				updateStore();
			} catch {
				saveError = 'Failed to save your answer. Please try again.';
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		}
	};

	const hasUnsavedChanges = $derived(
		String(candidateInput ?? '').trim() !== String(lastSavedInput ?? '').trim()
	);
	const hasSavedBefore = $derived(String(lastSavedInput ?? '').trim().length > 0);

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		return Array.isArray(selected?.response) && selected.response.includes(optionId);
	};

	const optionFeedbackClass = (optionId: number) => {
		if (!isFeedbackViewed || !correctAnswer) return '';
		if (Array.isArray(correctAnswer) && correctAnswer.includes(optionId)) {
			return 'bg-green-100 border-green-500 text-green-700';
		}
		if (Array.isArray(currentSelection?.response) && currentSelection.response.includes(optionId)) {
			return 'bg-red-100 border-red-500 text-red-700';
		}
		return '';
	};

	const getOptionFeedbackStatus = (optionId: number): 'correct' | 'wrong' | 'none' => {
		if (!isFeedbackViewed || !correctAnswer) return 'none';
		if (Array.isArray(correctAnswer) && correctAnswer.includes(optionId)) return 'correct';
		if (Array.isArray(currentSelection?.response) && currentSelection.response.includes(optionId))
			return 'wrong';
		return 'none';
	};

	const updateStore = () => {
		sessionStore.current = {
			...sessionStore.current,
			candidate,
			selections: selectedQuestions
		};
	};

	const confirmViewFeedback = async () => {
		const answeredQuestion = selectedQuestion(question.id);
		const currentResponse = answeredQuestion?.response ?? [];
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		selectedQuestions = selectedQuestions.map((q) =>
			q.question_revision_id === question.id ? { ...q, is_reviewed: true } : q
		);
		updateStore();

		try {
			const result = await submitAnswer(question.id, currentResponse, currentBookmarked, true);
			if (result?.correct_answer != null) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === question.id
						? { ...q, correct_answer: result.correct_answer }
						: q
				);
				updateStore();
			}
		} catch {
			// Question stays locked — user already saw the correct answer
		}
	};

	const handleSelection = async (questionId: number, optionId: number, isRemoving = false) => {
		if (isLocked) return;

		const answeredQuestion = selectedQuestion(questionId);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		let newResponse: number[];
		if (isRemoving) {
			if (!answeredQuestion || typeof answeredQuestion.response === 'string') return;
			newResponse = answeredQuestion.response.filter((id) => id !== optionId);
		} else {
			if (question.question_type === 'single-choice') {
				newResponse = [optionId];
			} else {
				const existingResponse =
					answeredQuestion && typeof answeredQuestion.response !== 'string'
						? answeredQuestion.response
						: [];
				newResponse = [...existingResponse, optionId];
			}
		}

		if (question.question_type === 'single-choice' && !isRemoving) {
			if (isSubmitting) {
				return;
			}
			isSubmitting = true;
			saveError = null;
			try {
				await submitAnswer(questionId, newResponse, currentBookmarked);

				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId ? { ...q, response: newResponse } : q
					);
				} else {
					selectedQuestions = [
						...selectedQuestions,
						{
							question_revision_id: questionId,
							response: newResponse,
							visited: true,
							time_spent: 0,
							bookmarked: currentBookmarked,
							is_reviewed: false
						}
					];
				}
				updateStore();
			} catch {
				// force complete remount of RadioGroup
				radioGroupKey++;
				saveError = 'Failed to save your answer. Please try again.';
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		} else {
			if (isSubmitting) {
				return;
			}
			isSubmitting = true;
			saveError = null;
			const previousState = JSON.parse(JSON.stringify(selectedQuestions));

			if (isRemoving) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === questionId && typeof q.response !== 'string'
						? { ...q, response: q.response.filter((id) => id !== optionId) }
						: q
				);
			} else {
				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId ? { ...q, response: newResponse } : q
					);
				} else {
					selectedQuestions = [
						...selectedQuestions,
						{
							question_revision_id: questionId,
							response: newResponse,
							visited: true,
							time_spent: 0,
							bookmarked: currentBookmarked,

							is_reviewed: false
						}
					];
				}
			}
			updateStore();

			try {
				await submitAnswer(questionId, newResponse);
			} catch {
				// revert on error
				selectedQuestions = previousState;
				updateStore();
				saveError = 'Failed to save your answer. Please try again.';
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		}
	};

	const submitAnswer = async (
		questionId: number,
		response: number[] | string,
		bookmarked?: boolean,
		is_reviewed?: boolean
	) => {
		const data = {
			question_revision_id: questionId,
			response: response.length > 0 ? response : null,
			candidate,
			bookmarked,
			is_reviewed
		};

		try {
			const res = await fetch(`/test/${page.params.slug}/api/submit-answer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to submit answer');
			}

			return await res.json();
		} catch (error) {
			console.error('Failed to submit answer:', error);
			throw error;
		}
	};

	const handleBookmark = async () => {
		if (isLocked) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;
		const newBookmarked = !currentBookmarked;
		const currentResponse = answeredQuestion?.response;

		if (isSubmitting) return;
		isSubmitting = true;
		saveError = null;

		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id
					? { ...q, bookmarked: newBookmarked, visited: true }
					: q
			);
		} else {
			const defaultResponse = question.question_type === 'subjective' ? '' : [];
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: defaultResponse,
					visited: true,
					time_spent: 0,
					bookmarked: newBookmarked,
					is_reviewed: false
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, currentResponse ?? [], newBookmarked);
		} catch {
			// revert on error
			if (answeredQuestion) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === question.id ? { ...q, bookmarked: currentBookmarked } : q
				);
			} else {
				selectedQuestions = selectedQuestions.filter((q) => q.question_revision_id !== question.id);
			}
			updateStore();
			saveError = 'Failed to save bookmark. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};

	const isQuestionBookmarked = $derived(selectedQuestion(question.id)?.bookmarked ?? false);

	const matrixResponse = $derived(parseMatrixResponse(selectedQuestion(question.id)?.response));

	const getMatrixSelection = (rowId: number): number | undefined => matrixResponse[String(rowId)];

	const handleSubjectiveSubmit = async () => {
		if (isSubmitting) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		isSubmitting = true;
		saveError = null;

		const previousState = JSON.parse(JSON.stringify(selectedQuestions));

		const inputValue = String(candidateInput ?? '');
		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id ? { ...q, response: inputValue } : q
			);
		} else {
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: inputValue,
					visited: true,
					time_spent: 0,
					bookmarked: currentBookmarked
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, inputValue, currentBookmarked);
			lastSavedInput = candidateInput;
		} catch {
			selectedQuestions = previousState;
			updateStore();
			saveError = 'Failed to save your answer. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};
</script>

{#snippet showCorrectWrongMark(answerStatus: string)}
	{#if answerStatus === 'correct'}
		<span class="flex-end flex gap-1 text-xs font-medium text-green-600"
			>{$t('Correct')}
			<Check size={18} class="text-green-600" />
		</span>
	{:else if answerStatus === 'wrong'}
		<span class="flex-end flex gap-1 text-xs font-medium text-red-600"
			>{$t('Wrong')}
			<X size={18} class="text-red-600" />
		</span>
	{/if}
{/snippet}

<Card.Root
	class="mb-4 w-full rounded-xl shadow-md {isSubmitting ? 'pointer-events-none opacity-60' : ''}"
>
	<Card.Header class="p-5">
		<Card.Title class="mb-5 border-b pb-3 text-sm">
			{serialNumber} <span>{$t('OF')} {totalQuestions}</span>
			{#if question?.marking_scheme}
				{@const mark = question.marking_scheme.correct}
				{@const scheme = question.marking_scheme}
				<span class="group relative float-end cursor-help select-none">
					<span class="text-muted-foreground inline-flex items-center gap-1">
						{mark === 1 ? `1 ${$t('Mark')}` : `${mark} ${$t('Marks')}`}
						<Info size={13} class="text-muted-foreground/60" />
					</span>
					<div
						class="absolute top-full right-0 z-20 mt-1 hidden min-w-48 rounded-lg border bg-white p-3 text-xs shadow-lg group-hover:block"
					>
						<p class="text-foreground mb-2 font-semibold">{$t('Marking Scheme')}</p>
						<div class="space-y-1.5">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">{$t('Correct')}</span>
								<span class="font-medium text-green-600">+{scheme.correct}</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">{$t('Wrong')}</span>
								<span class="font-medium {scheme.wrong < 0 ? 'text-red-600' : 'text-foreground'}"
									>{scheme.wrong > 0 ? `+${scheme.wrong}` : scheme.wrong}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">{$t('Skipped')}</span>
								<span class="text-foreground font-medium">{scheme.skipped}</span>
							</div>
						</div>
						{#if scheme.partial?.correct_answers?.length && question.question_type === 'multi-choice'}
							<div class="border-muted-foreground/20 mt-2.5 border-t pt-2.5">
								<p class="text-foreground mb-1.5 font-semibold">{$t('Partial Marks')}</p>
								<div class="space-y-1.5">
									{#each scheme.partial.correct_answers as rule, i (i)}
										<div class="flex justify-between gap-4">
											<span class="text-muted-foreground"
												>{rule.num_correct_selected}
												{$t('correct selected')}</span
											>
											<span class="font-medium text-green-600">+{rule.marks}</span>
										</div>
									{/each}
								</div>
								<p class="text-muted-foreground/65 mt-2 text-[11px] leading-snug">
									{$t('Partial marks awarded if no wrong option is selected')}
								</p>
							</div>
						{/if}
					</div>
				</span>
			{/if}
			{#if isSubmitting}
				<span class="float-end mr-2"><Spinner /></span>
			{/if}
		</Card.Title>
		<Card.Description class="text-base/normal font-medium">
			{question.question_text}
			{#if question.is_mandatory}
				<span class="ml-1 text-red-500">*</span>
			{/if}
			{#if question.instructions}
				<span class="text-muted-foreground mt-2 block text-sm">
					{question.instructions}
				</span>
			{/if}
			<QuestionMedia media={question.media} />
		</Card.Description>
	</Card.Header>

	<Card.Content class="p-5 pt-1">
		{#if saveError}
			<div
				class="border-destructive bg-destructive/10 text-destructive mb-4 rounded-lg border p-3 text-sm"
			>
				{saveError}
			</div>
		{/if}
		{#if question.question_type === question_type_enum.SINGLE}
			{#key radioGroupKey}
				<RadioGroup.Root
					onValueChange={async (optionId) => {
						await handleSelection(question.id, Number(optionId));
					}}
					value={(() => {
						const resp = selectedQuestion(question.id)?.response;
						return typeof resp !== 'string' ? resp?.[0]?.toString() : undefined;
					})()}
					disabled={isLocked}
				>
					{@const typedOptions = options as TOptions[]}
					{#each typedOptions as option, index (index)}
						{@const uid = `${question.id}-${option.key}`}
						{@const feedbackClass = optionFeedbackClass(option.id)}
						{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
						<Label
							for={uid}
							class={`cursor-pointer rounded-xl border px-4 py-5 ${
								isFeedbackViewed
									? feedbackClass || ''
									: isSelected(option.id)
										? 'bg-primary text-muted *:border-muted *:text-muted'
										: ''
							} ${isLocked ? 'cursor-not-allowed' : ''}`}
						>
							<div class="flex w-full items-center justify-between">
								<span>{option.key}. {option.value}</span>
								<div class="flex items-center gap-1">
									{#if feedbackStatus === 'correct'}
										{@render showCorrectWrongMark('correct')}
									{:else if feedbackStatus === 'wrong'}
										{@render showCorrectWrongMark('wrong')}
									{:else}
										<RadioGroup.Item value={option.id.toString()} id={uid} disabled={isLocked} />
									{/if}
								</div>
							</div>
							{#if option.media}
								<QuestionMedia media={option.media} />
							{/if}
						</Label>
					{/each}
				</RadioGroup.Root>
			{/key}
		{:else if question.question_type === question_type_enum.SUBJECTIVE}
			<div class="flex flex-col gap-2">
				<textarea
					class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-30 w-full rounded-xl border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					placeholder={$t('Type your answer here...')}
					bind:value={candidateInput}
					maxlength={question.subjective_answer_limit || undefined}
				></textarea>
				<div class="flex items-center justify-between">
					<Button
						variant="default"
						size="sm"
						onclick={handleSubjectiveSubmit}
						disabled={isSubmitting || !String(candidateInput ?? '').trim() || !hasUnsavedChanges}
					>
						{#if !hasUnsavedChanges && hasSavedBefore}
							<Check class="mr-1 h-4 w-4" />
							{$t('Saved')}
						{:else if hasSavedBefore}
							{$t('Update Answer')}
						{:else}
							{$t('Save Answer')}
						{/if}
					</Button>
					{#if question.subjective_answer_limit}
						{@const remaining = question.subjective_answer_limit - candidateInput.length}
						<div class="flex flex-col">
							<span
								class="text-sm {remaining <= 0
									? 'font-medium text-red-500'
									: 'text-muted-foreground'}"
							>
								{remaining}
								{$t('characters remaining')}
							</span>
							{#if remaining <= 0}
								<span class="text-xs text-red-500">
									{$t('Character limit reached')}
								</span>
							{/if}
						</div>
					{:else}
						<span></span>
					{/if}
				</div>
			</div>
		{:else if question.question_type === question_type_enum.NUMERICALINTEGER || question.question_type === question_type_enum.NUMERICALDECIMAL}
			{#if isLocked}
				{@const isCorrect = checkNumberAnswerCorrect()}
				{@const feedbackClass =
					isCorrect === null
						? 'border-gray-300 bg-white text-gray-700'
						: isCorrect
							? 'border-green-400 bg-green-100 text-green-700'
							: 'border-red-400 bg-red-100 text-red-700'}
				{@const candidateResponse = currentSelection?.response}
				{@const correctAnswer = currentSelection?.correct_answer}
				<div
					data-testid="numerical-answer-feedback"
					class={`flex rounded-xl border px-4 py-4 ${feedbackClass}`}
				>
					{#if typeof candidateResponse === 'string' && candidateResponse.trim()}
						<p class="w-full text-sm whitespace-pre-wrap">{candidateResponse}</p>
						{#if isCorrect === true}
							{@render showCorrectWrongMark('correct')}
						{:else if isCorrect === false}
							{@render showCorrectWrongMark('wrong')}
						{/if}
					{:else}
						<p class="text-muted-foreground text-sm italic">{$t('Not Attempted')}</p>
					{/if}
				</div>
				{#if isCorrect === false}
					<div
						data-testid="numerical-correct-answer"
						class="mt-4 flex flex-row rounded-xl border border-green-400 bg-green-100 px-4 py-4 text-green-700"
					>
						<p class="w-full text-sm whitespace-pre-wrap">{correctAnswer}</p>
						{@render showCorrectWrongMark('correct')}
					</div>
				{/if}
			{:else}
				<div class="flex flex-col gap-2">
					<input
						type="number"
						step={question.question_type === question_type_enum.NUMERICALDECIMAL ? 'any' : '1'}
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-xl border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						placeholder={$t('Type your answer here...')}
						bind:value={candidateInput}
					/>
					<div class="flex items-center justify-between">
						<Button
							variant="default"
							size="sm"
							onclick={handleSubjectiveSubmit}
							disabled={isSubmitting || !String(candidateInput ?? '').trim() || !hasUnsavedChanges}
						>
							{#if !hasUnsavedChanges && hasSavedBefore}
								<Check class="mr-1 h-4 w-4" />
								{$t('Saved')}
							{:else if hasSavedBefore}
								{$t('Update Answer')}
							{:else}
								{$t('Save Answer')}
							{/if}
						</Button>
					</div>
				</div>
			{/if}
		{:else if question.question_type === question_type_enum.MATRIXMATCH}
			{@const matrix = options as TMatrixOptions}
			{@const matrixRows = matrix.rows.items}
			{@const matrixColumns = matrix.columns.items}

			<div class="mb-5 grid grid-cols-2 gap-6 border-b border-gray-200 pb-5">
				<div>
					<p class="mb-2 text-sm font-semibold text-gray-700">{matrix.rows.label}</p>
					<div class="flex flex-col gap-2">
						{#each matrixRows as row (row.id)}
							<p class="text-sm text-gray-800">
								<span class="font-semibold">{row.key}.</span>
								<span class="ml-1">{row.value}</span>
							</p>
						{/each}
					</div>
				</div>
				<div>
					<p class="mb-2 text-sm font-semibold text-gray-700">{matrix.columns.label}</p>
					<div class="flex flex-col gap-2">
						{#each matrixColumns as col (col.id)}
							<p class="text-sm text-gray-800">
								<span class="font-semibold">{col.key}.</span>
								<span class="ml-1">{col.value}</span>
							</p>
						{/each}
					</div>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="border-collapse text-sm">
					<thead>
						<tr>
							<th class="w-10 px-3 py-2"></th>
							{#each matrixColumns as col (col.id)}
								<th class="px-5 py-2 text-center text-sm font-semibold text-gray-700">
									{col.key}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each matrixRows as row (row.id)}
							<tr>
								<td class="px-3 py-3 text-sm font-semibold text-gray-700">{row.key}</td>
								{#each matrixColumns as col (col.id)}
									{@const isChecked = (matrixSelections[row.id] ?? []).includes(col.id)}
									<td class="px-5 py-3 text-center">
										<Checkbox
											checked={isChecked}
											disabled={isLocked}
											onCheckedChange={() => handleMatrixInput(row.id, col.id)}
										/>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if question.question_type === question_type_enum.MATRIXRATING}
			{@const matrixOpts = question.options as unknown as TMatrixOptions}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr>
							<th class="border border-gray-300 bg-gray-100 px-4 py-3 text-left font-semibold">
								{matrixOpts.rows.label}
							</th>
							{#each matrixOpts.columns.items as col (col.id)}
								<th class="border border-gray-300 bg-gray-100 px-4 py-3 text-center font-semibold">
									{col.key} – {col.value}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each matrixOpts.rows.items as row (row.id)}
							<tr class="hover:bg-gray-50">
								<td class="border border-gray-300 px-4 py-3 font-medium">{row.value}</td>
								{#each matrixOpts.columns.items as col (col.id)}
									<td class="border border-gray-300 px-4 py-3 text-center">
										<input
											type="radio"
											name="matrix-{question.id}-row-{row.id}"
											value={col.id}
											checked={getMatrixSelection(row.id) === col.id}
											disabled={isLocked}
											class="accent-primary h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
											onchange={() => handleMatrixInput(row.id, col.id)}
										/>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			{@const typedOptions = options as TOptions[]}
			{#each typedOptions as option (option.id)}
				{@const uid = `${question.id}-${option.key}`}
				{@const feedbackClass = optionFeedbackClass(option.id)}
				{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
				<div class="flex flex-row items-start space-x-3">
					<Label
						for={uid}
						class={`mb-2 w-full cursor-pointer rounded-xl border px-4 py-5 ${
							isFeedbackViewed
								? feedbackClass || ''
								: isSelected(option.id)
									? 'bg-primary text-muted *:border-muted *:text-muted'
									: ''
						} ${isLocked ? 'cursor-not-allowed' : ''}`}
					>
						<div class="flex w-full items-center justify-between">
							<span>{option.key}. {option.value}</span>
							<div class="flex items-center gap-1">
								{#if feedbackStatus === 'correct'}
									{@render showCorrectWrongMark('correct')}
								{:else if feedbackStatus === 'wrong'}
									{@render showCorrectWrongMark('wrong')}
								{:else}
									<Checkbox
										id={uid}
										value={option.id.toString()}
										checked={isSelected(option.id)}
										disabled={isLocked}
										onCheckedChange={async (check) => {
											await handleSelection(question.id, option.id, check === false);
										}}
									/>
								{/if}
							</div>
						</div>
						{#if option.media}
							<QuestionMedia media={option.media} />
						{/if}
					</Label>
				</div>
			{/each}
		{/if}

		{#if showFeedback && hasFeedbackAvailable && !isFeedbackViewed && question.question_type !== 'subjective' && question.question_type !== 'matrix-match' && question.question_type !== question_type_enum.MATRIXRATING}
			<Button
				variant="outline"
				class="mt-4 w-full border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
				onclick={confirmViewFeedback}
			>
				{$t('View Feedback')}
			</Button>
		{/if}

		{#if showMarkForReview}
			<Button
				variant="outline"
				class="mt-4 w-full {isQuestionBookmarked
					? 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'
					: ''}"
				onclick={handleBookmark}
				disabled={isLocked}
			>
				<Bookmark class="mr-2 h-4 w-4 {isQuestionBookmarked ? 'fill-amber-500' : ''}" />
				{isQuestionBookmarked ? $t('Unmark for review') : $t('Mark for review')}
			</Button>
		{/if}
	</Card.Content>
</Card.Root>
