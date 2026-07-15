<script lang="ts">
	import { page } from '$app/state';
	import Flag from '@lucide/svelte/icons/flag';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseJsonRecord } from '$lib/helpers/matrixHelpers';
	import { question_type_enum, type TCandidate, type TQuestion, type TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';
	import { getQuestionResult, GRADABLE_QUESTION_TYPES } from '$lib/helpers/feedbackHelpers';
	import RichText from './RichText.svelte';

	import QuestionMedia from './QuestionMedia.svelte';
	import ResultBadge from './ResultBadge.svelte';
	import BottomSheetModal from './BottomSheetModal.svelte';
	import MarkingSchemeContent from './MarkingSchemeContent.svelte';
	import ChoiceAnswer from './answer/ChoiceAnswer.svelte';
	import SubjectiveAnswer from './answer/SubjectiveAnswer.svelte';
	import NumericalAnswer from './answer/NumericalAnswer.svelte';
	import MatrixRatingAnswer from './answer/MatrixRatingAnswer.svelte';
	import MatrixMatchAnswer from './answer/MatrixMatchAnswer.svelte';
	import MatrixInputAnswer from './answer/MatrixInputAnswer.svelte';

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

	// key to force remount of RadioGroup on error, this is to prevent radio button from being checked
	let radioGroupKey = $state(0);
	let subjectiveAnswerRef: { setInput: (value: string) => void } | undefined = $state();
	let numericalAnswerRef: { setInput: (value: string) => void } | undefined = $state();
	let matrixMatchAnswerRef:
		| { setSelections: (value: Record<string, number[]>) => void }
		| undefined = $state();
	let matrixInputAnswerRef: { setValues: (value: Record<string, string>) => void } | undefined =
		$state();
	let isSubmitting = $state(false);
	let saveError = $state<string | null>(null);
	let markingSchemeOpen = $state(false);
	const SECTION_LIMIT_ERROR_PREFIX = 'Maximum attempt limit reached for section';

	const sessionStore = createTestSessionStore(candidate);
	const selectedQuestion = (questionId: number) => {
		return selectedQuestions.find((item) => item.question_revision_id === questionId);
	};

	const currentSelection = $derived(selectedQuestion(question.id));
	const hasFeedbackAvailable = $derived((currentSelection?.response?.length ?? 0) > 0);
	const isFeedbackViewed = $derived(currentSelection?.is_reviewed === true);
	const isLocked = $derived(isFeedbackViewed);

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
		const previousMatrixSelections = (() => {
			const parsed = parseJsonRecord<number | number[]>(answeredQuestion.response);
			return Object.fromEntries(
				Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
			);
		})();
		const previousMatrixInputValues = parseJsonRecord<string>(answeredQuestion.response);
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
			if (question.question_type === question_type_enum.SUBJECTIVE) {
				subjectiveAnswerRef?.setInput('');
			} else {
				numericalAnswerRef?.setInput('');
			}
		} else if (question.question_type === question_type_enum.MATRIXMATCH) {
			matrixMatchAnswerRef?.setSelections({});
		} else if (question.question_type === question_type_enum.MATRIXINPUT) {
			matrixInputAnswerRef?.setValues({});
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
				const restoredValue = typeof previousResponse === 'string' ? previousResponse : '';
				if (question.question_type === question_type_enum.SUBJECTIVE) {
					subjectiveAnswerRef?.setInput(restoredValue);
				} else {
					numericalAnswerRef?.setInput(restoredValue);
				}
			} else if (question.question_type === question_type_enum.MATRIXMATCH) {
				matrixMatchAnswerRef?.setSelections(previousMatrixSelections);
			} else if (question.question_type === question_type_enum.MATRIXINPUT) {
				matrixInputAnswerRef?.setValues(previousMatrixInputValues);
			}

			setTransientSaveError(error, 'Failed to clear your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};
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
		{#if question.question_type === question_type_enum.SINGLE || question.question_type === question_type_enum.MULTIPLE}
			<ChoiceAnswer
				{question}
				{candidate}
				bind:selections={selectedQuestions}
				variant="card"
				bind:radioGroupKey
				bind:isSubmitting
			/>
		{:else if question.question_type === question_type_enum.SUBJECTIVE}
			<SubjectiveAnswer
				bind:this={subjectiveAnswerRef}
				{question}
				{candidate}
				bind:selections={selectedQuestions}
				variant="card"
				bind:isSubmitting
			/>
		{:else if question.question_type === question_type_enum.NUMERICALINTEGER || question.question_type === question_type_enum.NUMERICALDECIMAL}
			<NumericalAnswer
				bind:this={numericalAnswerRef}
				{question}
				{candidate}
				bind:selections={selectedQuestions}
				variant="card"
				bind:isSubmitting
			/>
		{:else if question.question_type === question_type_enum.MATRIXMATCH}
			<MatrixMatchAnswer
				bind:this={matrixMatchAnswerRef}
				{question}
				{candidate}
				bind:selections={selectedQuestions}
				variant="card"
				bind:isSubmitting
			/>
		{:else if question.question_type === question_type_enum.MATRIXRATING}
			<MatrixRatingAnswer
				{question}
				{candidate}
				bind:selections={selectedQuestions}
				variant="card"
				bind:isSubmitting
			/>
		{:else if question.question_type === question_type_enum.MATRIXINPUT}
			<MatrixInputAnswer
				bind:this={matrixInputAnswerRef}
				{question}
				{candidate}
				bind:selections={selectedQuestions}
				variant="card"
				bind:isSubmitting
			/>
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
