<script lang="ts">
	import { page } from '$app/state';
	import Flag from '@lucide/svelte/icons/flag';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
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
	import { cn } from '$lib/utils';
	import {
		isNumericalAnswerCorrect,
		getQuestionResult,
		GRADABLE_QUESTION_TYPES,
		parseMatrixAnswer,
		getMatrixCellStatus
	} from '$lib/helpers/feedbackHelpers';
	import RichText from './RichText.svelte';

	import QuestionMedia from './QuestionMedia.svelte';
	import ResultBadge from './ResultBadge.svelte';
	import BottomSheetModal from './BottomSheetModal.svelte';
	import MarkingSchemeContent from './MarkingSchemeContent.svelte';

	let {
		question,
		serialNumber,
		candidate,
		totalQuestions,
		selectedQuestions = $bindable(),
		showFeedback = false,
		showMarkForReview = true,
		showMarks = true
	}: {
		question: TQuestion;
		candidate: TCandidate;
		serialNumber: number;
		totalQuestions: number;
		selectedQuestions: TSelection[];
		showFeedback?: boolean;
		showMarkForReview?: boolean;
		showMarks?: boolean;
	} = $props();

	const options = question.options;

	// key to force remount of RadioGroup on error, this is to prevent radio button from being checked
	let radioGroupKey = $state(0);
	let isSubmitting = $state(false);
	let saveError = $state<string | null>(null);
	let markingSchemeOpen = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	let saveStatus: 'idle' | 'pending' | 'saving' | 'saved' = $state('idle');
	let flushFn: (() => void) | undefined;
	const SECTION_LIMIT_ERROR_PREFIX = 'Maximum attempt limit reached for section';

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

	const feedbackResult = $derived(
		isLocked && currentSelection?.correct_answer != null
			? getQuestionResult(
					question.question_type,
					currentSelection?.response,
					currentSelection?.correct_answer
				)
			: null
	);

	const showMarkForReviewButton = $derived(showMarkForReview && !(showFeedback && isLocked));

	const getExistingInputResponse = () => {
		const selected = selectedQuestion(question.id);
		return typeof selected?.response === 'string' ? selected.response : '';
	};
	let candidateInput = $state(getExistingInputResponse());

	const getExistingMatrixSelections = (): Record<string, number[]> => {
		const parsed = parseJsonRecord<number | number[]>(selectedQuestion(question.id)?.response);
		return Object.fromEntries(
			Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
		);
	};
	let matrixSelections = $state<Record<string, number[]>>(getExistingMatrixSelections());

	let matrixInputValues = $state<Record<string, string>>(
		parseJsonRecord<string>(selectedQuestion(question.id)?.response)
	);

	const handleMatrixInputChange = (rowId: number, value: string) => {
		if (isLocked || isSubmitting) return;
		matrixInputValues = { ...matrixInputValues, [String(rowId)]: value };
		scheduleSave(handleMatrixInputSave);
	};

	const handleMatrixInputSave = async () => {
		if (isLocked || isSubmitting) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;
		const normalized = normalizeMatrixInputValues(matrixInputValues);
		const serialized = Object.keys(normalized).length > 0 ? JSON.stringify(normalized) : '';
		const previousState = JSON.parse(JSON.stringify(selectedQuestions));

		isSubmitting = true;
		saveStatus = 'saving';
		saveError = null;

		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id ? { ...q, response: serialized } : q
			);
		} else {
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: serialized,
					visited: true,
					time_spent: 0,
					bookmarked: currentBookmarked,
					is_reviewed: false
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, serialized, currentBookmarked);
			saveStatus = 'saved';
		} catch {
			selectedQuestions = previousState;
			updateStore();
			saveStatus = 'idle';
			saveError = $t('Failed to save your answer. Please try again.');
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};

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
				saveError = $t('Failed to save your answer. Please try again.');
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		} else {
			const newResponse = JSON.stringify({
				...parseJsonRecord<number>(answeredQuestion?.response),
				[rowKey]: colId
			});

			try {
				await submitAnswer(question.id, newResponse, currentBookmarked);
				applyUpdate(newResponse);
				updateStore();
			} catch {
				saveError = $t('Failed to save your answer. Please try again.');
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		}
	};

	const hasAttemptedResponse = (response: number[] | string | undefined): boolean => {
		if (typeof response === 'string') {
			return response.trim().length > 0;
		}

		return (response?.length ?? 0) > 0;
	};
	const hasClearableAnswer = $derived(hasAttemptedResponse(currentSelection?.response));
	const isSectionLimitWarning = $derived(saveError?.includes(SECTION_LIMIT_ERROR_PREFIX) ?? false);

	const getErrorMessage = (error: unknown, fallback: string) =>
		error instanceof Error && error.message ? error.message : fallback;

	const setTransientSaveError = (error: unknown, fallback: string) => {
		saveError = getErrorMessage(error, fallback);
		setTimeout(() => (saveError = null), 5000);
	};

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		return Array.isArray(selected?.response) && selected.response.includes(optionId);
	};

	const optionFeedbackClass = (optionId: number) => {
		if (!isFeedbackViewed || !correctAnswer) return '';
		if (Array.isArray(correctAnswer) && correctAnswer.includes(optionId)) {
			return 'bg-success-subtle border-success';
		}
		if (Array.isArray(currentSelection?.response) && currentSelection.response.includes(optionId)) {
			return 'bg-error-subtle border-error';
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
			} catch (error) {
				// force complete remount of RadioGroup
				radioGroupKey++;
				setTransientSaveError(error, 'Failed to save your answer. Please try again.');
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
				await submitAnswer(questionId, newResponse, currentBookmarked);
			} catch (error) {
				// revert on error
				selectedQuestions = previousState;
				updateStore();
				setTransientSaveError(error, 'Failed to save your answer. Please try again.');
			} finally {
				isSubmitting = false;
			}
		}
	};

	const submitAnswer = async (
		questionId: number,
		response: number[] | string | null,
		bookmarked?: boolean,
		is_reviewed?: boolean
	) => {
		const data = {
			question_revision_id: questionId,
			response: response == null ? null : response.length > 0 ? response : null,
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
		} catch (error) {
			// revert on error
			if (answeredQuestion) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === question.id ? { ...q, bookmarked: currentBookmarked } : q
				);
			} else {
				selectedQuestions = selectedQuestions.filter((q) => q.question_revision_id !== question.id);
			}
			updateStore();
			setTransientSaveError(error, 'Failed to save bookmark. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};

	const isQuestionBookmarked = $derived(selectedQuestion(question.id)?.bookmarked ?? false);
	const handleClearAnswer = async () => {
		if (isLocked || isSubmitting || !hasClearableAnswer) return;

		const answeredQuestion = selectedQuestion(question.id);
		if (!answeredQuestion) return;

		const currentBookmarked = answeredQuestion.bookmarked ?? false;
		const previousState = JSON.parse(JSON.stringify(selectedQuestions));
		const previousMatrixSelections = { ...matrixSelections };
		const previousMatrixInputValues = { ...matrixInputValues };
		const clearedResponse =
			question.question_type === question_type_enum.SUBJECTIVE ||
			question.question_type === question_type_enum.NUMERICALINTEGER ||
			question.question_type === question_type_enum.NUMERICALDECIMAL
				? ''
				: [];

		isSubmitting = true;
		saveError = null;

		selectedQuestions = selectedQuestions.map((selection) =>
			selection.question_revision_id === question.id
				? {
						...selection,
						response: clearedResponse,
						visited: true,
						bookmarked: currentBookmarked,
						is_reviewed: false,
						correct_answer: undefined
					}
				: selection
		);
		updateStore();

		if (typeof clearedResponse === 'string') {
			candidateInput = '';
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
			saveStatus = 'idle';
		} else if (question.question_type === question_type_enum.MATRIXMATCH) {
			matrixSelections = {};
		} else if (question.question_type === question_type_enum.MATRIXINPUT) {
			matrixInputValues = {};
			clearTimeout(debounceTimer);
			debounceTimer = undefined;
			saveStatus = 'idle';
		}

		try {
			await submitAnswer(question.id, clearedResponse, currentBookmarked);
			if (question.question_type === question_type_enum.SINGLE) {
				radioGroupKey++;
			}
		} catch (error) {
			selectedQuestions = previousState;
			updateStore();

			if (typeof clearedResponse === 'string') {
				const previousResponse = previousState.find(
					(selection: TSelection) => selection.question_revision_id === question.id
				)?.response;
				candidateInput = typeof previousResponse === 'string' ? previousResponse : '';
			} else if (question.question_type === question_type_enum.MATRIXMATCH) {
				matrixSelections = previousMatrixSelections;
			} else if (question.question_type === question_type_enum.MATRIXINPUT) {
				matrixInputValues = previousMatrixInputValues;
			}

			setTransientSaveError(error, 'Failed to clear your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};

	const matrixResponse = $derived(parseJsonRecord<number>(selectedQuestion(question.id)?.response));

	const getMatrixSelection = (rowId: number): number | undefined => matrixResponse[String(rowId)];

	const handleSubjectiveSubmit = async () => {
		if (isSubmitting) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		isSubmitting = true;
		saveStatus = 'saving';
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
					bookmarked: currentBookmarked,
					is_reviewed: false
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, inputValue, currentBookmarked);
			saveStatus = 'saved';
		} catch (error) {
			selectedQuestions = previousState;
			updateStore();
			saveStatus = 'idle';
			setTransientSaveError(error, 'Failed to save your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};

	const scheduleSave = (saveFn: () => void = handleSubjectiveSubmit) => {
		saveStatus = 'pending';
		flushFn = saveFn;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => saveFn(), 800);
	};

	$effect(() => {
		return () => {
			if (debounceTimer !== undefined && saveStatus === 'pending' && flushFn) {
				clearTimeout(debounceTimer);
				flushFn();
			}
		};
	});
</script>

{#snippet marksPill()}
	<span
		data-testid="marks-pill"
		class="border-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
	>
		<span class="text-muted-foreground font-medium">{$t('Marks')}:</span>
		<span class="text-success font-semibold">+{question.marking_scheme?.correct}</span>
		{#if question.marking_scheme?.wrong !== 0}
			<span class="text-error font-semibold">{question.marking_scheme?.wrong}</span>
		{/if}
		<ChevronDown size={13} class="text-muted-foreground" />
	</span>
{/snippet}

{#snippet showCorrectWrongMark(answerStatus: string)}
	{#if answerStatus === 'correct'}
		<span
			data-testid="correct-mark"
			class="text-success flex shrink-0 items-center"
			aria-label={$t('Correct')}
		>
			<Check size={18} aria-hidden="true" />
		</span>
	{:else if answerStatus === 'wrong'}
		<span
			data-testid="wrong-mark"
			class="text-error flex shrink-0 items-center"
			aria-label={$t('Wrong')}
		>
			<X size={18} aria-hidden="true" />
		</span>
	{/if}
{/snippet}

<Card.Root
	class="mb-4 w-full rounded-xl shadow-none {isSubmitting ? 'pointer-events-none opacity-60' : ''}"
>
	<Card.Header class="p-4 lg:p-6">
		<div class="mb-4 flex items-center justify-between">
			<div
				class="bg-brand-light text-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
			>
				Q{serialNumber}
			</div>

			<div class="flex items-center gap-2">
				{#if isSubmitting}
					<Spinner />
				{/if}

				{#if showMarks && question?.marking_scheme && !(showFeedback && isLocked)}
					{@const scheme = question.marking_scheme}
					<div class="hidden lg:block">
						<button
							type="button"
							class="group relative cursor-pointer select-none"
							aria-label={$t('Marking scheme')}
						>
							{@render marksPill()}
							<div
								class="bg-card absolute top-full right-0 z-20 mt-1 hidden min-w-52 rounded-xl border p-4 text-sm shadow-lg group-hover:block group-focus:block"
							>
								<MarkingSchemeContent {scheme} questionType={question.question_type} />
							</div>
						</button>
					</div>

					<button
						type="button"
						class="cursor-pointer select-none lg:hidden"
						aria-label={$t('Marking scheme')}
						onclick={() => (markingSchemeOpen = true)}
					>
						{@render marksPill()}
					</button>

					<BottomSheetModal bind:open={markingSchemeOpen} title={$t('Marking scheme')}>
						<div class="p-5">
							<MarkingSchemeContent {scheme} questionType={question.question_type} />
						</div>
					</BottomSheetModal>
				{/if}

				{#if showFeedback && isLocked && question?.marking_scheme && GRADABLE_QUESTION_TYPES.has(question.question_type)}
					<ResultBadge result={feedbackResult} scheme={question.marking_scheme} />
				{/if}

				{#if showMarkForReviewButton}
					<button
						type="button"
						class="hidden items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors lg:flex
							{isQuestionBookmarked
							? 'border-warning bg-warning-subtle text-warning'
							: 'border-border text-muted-foreground'}"
						onclick={handleBookmark}
						disabled={isLocked}
					>
						<Flag class="h-4 w-4 {isQuestionBookmarked ? 'fill-current' : ''}" />
						{isQuestionBookmarked ? $t('Unmark for review') : $t('Mark for review')}
					</button>
				{/if}
			</div>
		</div>

		<div class="text-card-foreground text-base leading-snug font-bold">
			<RichText content={question.question_text} as="span" />
			{#if question.is_mandatory}
				<span class="text-destructive ml-0.5">*</span>
			{/if}
		</div>
		<QuestionMedia media={question.media} />
		{#if question.instructions}
			<RichText content={question.instructions} class="text-muted-foreground mt-2 text-sm" />
		{/if}
	</Card.Header>

	<Card.Content class="px-4 pt-0 pb-4 lg:px-6 lg:pb-6">
		{#if saveError}
			<div
				class={`mb-4 rounded-lg border p-3 text-sm ${
					isSectionLimitWarning
						? 'border-warning bg-warning-subtle text-warning'
						: 'border-destructive bg-destructive/10 text-destructive'
				}`}
			>
				{saveError}
				{#if isSectionLimitWarning}
					<p class="text-warning mt-2 text-xs">
						{$t('Clear another answered question in this section to attempt this one.')}
					</p>
				{/if}
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
					class="flex flex-col gap-3"
				>
					{@const typedOptions = options as TOptions[]}
					{#each typedOptions as option, index (index)}
						{@const uid = `${question.id}-${option.key}`}
						{@const feedbackClass = optionFeedbackClass(option.id)}
						{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
						<div class="flex items-start gap-3">
							<span class="text-muted-foreground mt-3 w-5 shrink-0 text-sm font-medium"
								>{option.key}</span
							>
							<Label
								for={uid}
								class={cn(
									'flex flex-1 cursor-pointer flex-col rounded-xl border transition-colors',
									isFeedbackViewed
										? feedbackClass || 'border-border bg-card'
										: isSelected(option.id)
											? 'border-primary bg-primary/10'
											: 'border-border bg-card',
									isLocked && 'cursor-not-allowed'
								)}
							>
								<div class="flex items-center gap-3 px-4 py-3">
									<RadioGroup.Item
										value={option.id.toString()}
										id={uid}
										disabled={isLocked}
										class={cn(
											feedbackStatus === 'correct' && 'border-success text-success',
											feedbackStatus === 'wrong' && 'border-error text-error'
										)}
									/>
									<span class={cn('text-foreground flex-1 text-sm', feedbackStatus !== 'none')}
										><RichText content={option.value} class="min-w-0 flex-1" /></span
									>
									{#if feedbackStatus === 'correct'}
										{@render showCorrectWrongMark('correct')}
									{:else if feedbackStatus === 'wrong'}
										{@render showCorrectWrongMark('wrong')}
									{/if}
								</div>
								{#if option.media}
									<div class="px-4 pb-4">
										<QuestionMedia media={option.media} />
									</div>
								{/if}
							</Label>
						</div>
					{/each}
				</RadioGroup.Root>
			{/key}
		{:else if question.question_type === question_type_enum.SUBJECTIVE}
			<div class="flex flex-col gap-2">
				<textarea
					style="field-sizing: content;"
					class="border-border bg-card placeholder:text-muted-foreground focus-visible:ring-ring min-h-22 w-full resize-none overflow-hidden rounded-[10px] border px-[14px] py-[10px] text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					placeholder={$t('Type your answer here...')}
					value={candidateInput}
					oninput={(e) => {
						candidateInput = e.currentTarget.value;
						scheduleSave();
					}}
					maxlength={question.subjective_answer_limit || undefined}
				></textarea>
				<div class="flex items-center justify-between">
					{#if saveStatus === 'saving'}
						<span class="text-muted-foreground flex items-center gap-1 text-xs">
							<Spinner class="size-3" />{$t('Saving...')}
						</span>
					{:else if saveStatus === 'saved'}
						<span class="text-success flex items-center gap-1 text-xs">
							<Check class="size-3" />{$t('Saved')}
						</span>
					{:else}
						<span></span>
					{/if}
					{#if question.subjective_answer_limit}
						{@const remaining = question.subjective_answer_limit - candidateInput.length}
						<div class="flex flex-col">
							<span
								class="text-sm {remaining <= 0
									? 'text-error font-medium'
									: 'text-muted-foreground'}"
							>
								{remaining}
								{$t('characters remaining')}
							</span>
							{#if remaining <= 0}
								<span class="text-error text-xs">
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
						? 'border-border bg-card text-foreground'
						: isCorrect
							? 'border-success bg-success-subtle text-success'
							: 'border-error bg-error-subtle text-error'}
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
						class="border-success bg-success-subtle text-success mt-4 flex flex-row rounded-xl border px-4 py-4"
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
						class="border-border bg-card placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-xl border border-dashed px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						placeholder={$t('Type your answer here...')}
						value={candidateInput}
						oninput={(e) => {
							candidateInput = e.currentTarget.value;
							scheduleSave();
						}}
					/>
					{#if saveStatus === 'saving'}
						<span class="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
							<Spinner class="size-3" />{$t('Saving...')}
						</span>
					{:else if saveStatus === 'saved'}
						<span class="text-success mt-1 flex items-center gap-1 text-xs">
							<Check class="size-3" />{$t('Saved')}
						</span>
					{/if}
				</div>
			{/if}
		{:else if question.question_type === question_type_enum.MATRIXMATCH}
			{@const matrix = options as TMatrixOptions}
			{@const matrixRows = matrix.rows.items}
			{@const matrixColumns = matrix.columns.items}
			{@const correctMatrix = isFeedbackViewed ? parseMatrixAnswer(correctAnswer) : {}}

			<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="border-border overflow-hidden rounded-xl border">
					<div
						class="bg-muted text-foreground py-4 text-center text-xs font-bold tracking-widest uppercase"
					>
						{matrix.rows.label}
					</div>
					{#each matrixRows as row (row.id)}
						<div class="border-border flex items-start gap-3 border-t px-4 py-3">
							<span class="text-foreground min-w-4 shrink-0 text-sm font-bold">{row.key}</span>
							<div class="text-foreground text-sm">
								{row.value}
								{#if row.media}
									<QuestionMedia media={row.media} />
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<div class="border-border overflow-hidden rounded-xl border">
					<div
						class="bg-muted text-foreground py-4 text-center text-xs font-bold tracking-widest uppercase"
					>
						{matrix.columns.label}
					</div>
					{#each matrixColumns as col (col.id)}
						<div class="border-border flex items-start gap-3 border-t px-4 py-3">
							<span class="text-foreground min-w-4 shrink-0 text-sm font-bold">{col.key}</span>
							<div class="text-foreground text-sm">
								{col.value}
								{#if col.media}
									<QuestionMedia media={col.media} />
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="bg-muted">
							<th class="border-border w-14 border px-4 py-3"></th>
							{#each matrixColumns as col (col.id)}
								<th
									class="border-border text-foreground min-w-16 border px-4 py-3 text-center font-semibold"
								>
									{col.key}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each matrixRows as row (row.id)}
							<tr class="border-border border-t">
								<td
									class="border-border text-foreground border px-4 py-3 text-center text-sm font-semibold"
									>{row.key}</td
								>
								{#each matrixColumns as col (col.id)}
									<td class="border-border border px-4 py-3 text-center">
										{#if isFeedbackViewed}
											{@const status = getMatrixCellStatus(
												row.id,
												col.id,
												matrixSelections,
												correctMatrix
											)}
											<div
												class={cn(
													'mx-auto flex h-5 w-5 items-center justify-center rounded border-2',
													status === 'correct' && 'bg-success border-success',
													status === 'missed' && 'bg-card border-success',
													status === 'wrong' && 'bg-error border-error',
													status === 'none' && 'bg-card border-border'
												)}
											>
												{#if status === 'correct' || status === 'wrong'}
													<Check size={14} class="text-primary-foreground" />
												{/if}
											</div>
										{:else}
											{@const isChecked = (matrixSelections[row.id] ?? []).includes(col.id)}
											<Checkbox
												checked={isChecked}
												disabled={isLocked}
												onCheckedChange={() => handleMatrixInput(row.id, col.id)}
												class="border-input data-[state=checked]:border-primary"
											/>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if question.question_type === question_type_enum.MATRIXRATING}
			{@const matrixOpts = question.options as unknown as TMatrixOptions}
			<div class="overflow-x-auto rounded-lg">
				<table class="border-border min-w-full border-collapse border text-sm">
					<thead>
						<tr class="border-border h-16 border-b">
							<th class="bg-muted text-muted-foreground min-w-55 px-5 text-left font-bold">
								{matrixOpts.rows.label}
							</th>
							{#each matrixOpts.columns.items as col (col.id)}
								<th class="bg-muted text-muted-foreground px-5 text-center font-bold">
									<span class="block">{col.value}</span>
									<span class="block">({col.key})</span>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each matrixOpts.rows.items as row (row.id)}
							<tr class="border-border hover:bg-accent border-b">
								<td class="min-w-55 px-4 py-3 font-medium wrap-break-word whitespace-normal">
									{row.value}
								</td>
								{#each matrixOpts.columns.items as col (col.id)}
									<td class="px-4 py-3 text-center">
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
		{:else if question.question_type === question_type_enum.MATRIXINPUT}
			{@const matrixOpts = question.options as TMatrixInputOptions}
			{@const inputType = matrixOpts.columns.input_type}
			<div class="overflow-x-auto">
				<div class="border-border overflow-hidden rounded-xl border">
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr class="border-border bg-muted border-b">
								<th class="text-foreground px-4 py-3 text-left font-semibold">
									{matrixOpts.rows.label}
								</th>
								<th class="text-foreground px-4 py-3 text-left font-semibold">
									{matrixOpts.columns.label}
								</th>
							</tr>
						</thead>
						<tbody>
							{#each matrixOpts.rows.items as row (row.id)}
								<tr class="border-border hover:bg-accent border-b last:border-b-0">
									<td class="w-1/2 px-4 py-3 font-medium">
										<span class="font-semibold">{row.key}.</span>
										<span class="ml-1">{row.value}</span>
									</td>
									<td class="w-1/2 px-4 py-3">
										<input
											type={inputType}
											class="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
											placeholder={$t('Enter answer')}
											value={matrixInputValues[String(row.id)] ?? ''}
											disabled={isLocked}
											oninput={(e) =>
												handleMatrixInputChange(row.id, (e.target as HTMLInputElement).value)}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
			{#if saveStatus === 'saving'}
				<span class="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
					<Spinner class="size-3" />{$t('Saving...')}
				</span>
			{:else if saveStatus === 'saved'}
				<span class="text-success mt-3 flex items-center gap-1 text-xs">
					<Check class="size-3" />{$t('Saved')}
				</span>
			{/if}
		{:else}
			{@const typedOptions = options as TOptions[]}
			<div class="flex flex-col gap-3">
				{#each typedOptions as option (option.id)}
					{@const uid = `${question.id}-${option.key}`}
					{@const feedbackClass = optionFeedbackClass(option.id)}
					{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
					<div class="flex items-start gap-3">
						<span class="text-muted-foreground mt-3 w-5 shrink-0 text-sm font-medium"
							>{option.key}</span
						>
						<Label
							for={uid}
							class={cn(
								'flex flex-1 cursor-pointer flex-col rounded-xl border transition-colors',
								isFeedbackViewed
									? feedbackClass || 'border-border bg-card'
									: isSelected(option.id)
										? 'border-primary bg-primary/10'
										: 'border-border bg-card',
								isLocked && 'cursor-not-allowed'
							)}
						>
							<div class="flex items-center gap-3 px-4 py-3">
								<Checkbox
									id={uid}
									value={option.id.toString()}
									checked={isSelected(option.id)}
									disabled={isLocked}
									onCheckedChange={async (check) => {
										await handleSelection(question.id, option.id, check === false);
									}}
									class={cn(
										feedbackStatus === 'correct' &&
											'border-success data-[state=checked]:bg-success',
										feedbackStatus === 'wrong' && 'border-error data-[state=checked]:bg-error'
									)}
								/>
								<span class={cn('text-foreground flex-1 text-sm', feedbackStatus !== 'none')}
									><RichText content={option.value} class="min-w-0 flex-1" /></span
								>
								{#if feedbackStatus === 'correct'}
									{@render showCorrectWrongMark('correct')}
								{:else if feedbackStatus === 'wrong'}
									{@render showCorrectWrongMark('wrong')}
								{/if}
							</div>
							{#if option.media}
								<div class="px-4 pb-4">
									<QuestionMedia media={option.media} />
								</div>
							{/if}
						</Label>
					</div>
				{/each}
			</div>
		{/if}

		{#if showFeedback && hasFeedbackAvailable && !isFeedbackViewed && question.question_type !== 'subjective' && question.question_type !== question_type_enum.MATRIXRATING && question.question_type !== question_type_enum.MATRIXINPUT}
			<Button
				variant="outline"
				class="border-primary bg-primary/10 text-primary hover:bg-primary/20 mt-4 w-full"
				onclick={confirmViewFeedback}
			>
				{$t('View Feedback')}
			</Button>
		{/if}

		<div class="mt-4 flex flex-col gap-3 sm:flex-row">
			<Button
				variant="outline"
				class="w-full sm:flex-1"
				onclick={handleClearAnswer}
				disabled={isLocked || !hasClearableAnswer}
			>
				{$t('Clear answer')}
			</Button>

			{#if showMarkForReviewButton}
				<button
					type="button"
					class="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium transition-colors lg:hidden
					{isQuestionBookmarked ? 'text-warning' : 'text-muted-foreground'}"
					onclick={handleBookmark}
					disabled={isLocked}
				>
					<Flag class="h-4 w-4 {isQuestionBookmarked ? 'fill-current' : ''}" />
					{isQuestionBookmarked ? $t('Unmark for review') : $t('Mark for review')}
				</button>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
