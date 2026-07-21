<script lang="ts">
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { isNumericalAnswerCorrect } from '$lib/helpers/feedbackHelpers';
	import {
		isSectionLimitError,
		createTransientSaveError,
		hasAttemptedResponse
	} from '$lib/helpers/answerErrorHelpers';
	import { question_type_enum, type TCandidate, type TQuestion, type TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';
	import SaveErrorBanner from './SaveErrorBanner.svelte';

	let {
		question,
		candidate,
		selections = $bindable(),
		variant,
		isSubmitting = $bindable(false)
	}: {
		question: TQuestion;
		candidate: TCandidate;
		selections: TSelection[];
		variant: 'card' | 'omr';
		isSubmitting?: boolean;
	} = $props();

	const sessionStore = createTestSessionStore(candidate);

	let saveError = $state<string | null>(null);
	let saveStatus: 'idle' | 'pending' | 'saving' | 'saved' = $state('idle');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	let flushFn: (() => void) | undefined;

	const currentSelection = $derived(
		selections.find((item) => item.question_revision_id === question.id)
	);
	const isLocked = $derived(variant === 'card' && currentSelection?.is_reviewed === true);
	const isSectionLimitWarning = $derived(isSectionLimitError(saveError));

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

	const hasClearableAnswer = $derived(hasAttemptedResponse(currentSelection?.response));

	const getExistingInputResponse = () =>
		typeof currentSelection?.response === 'string' ? currentSelection.response : '';
	let candidateInput = $state(getExistingInputResponse());

	// Lets the parent's shared "Clear answer" button (card variant) reset our
	// local typing buffer + in-flight debounce atomically, the same way it did
	// when this state lived directly in QuestionCard.
	export function setInput(value: string) {
		candidateInput = value;
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
		saveStatus = 'idle';
	}

	const setTransientSaveError = createTransientSaveError((value) => (saveError = value));

	const updateStore = () => {
		sessionStore.current = { ...sessionStore.current, candidate, selections };
	};

	const submitAnswer = async (response: string, bookmarked?: boolean) => {
		const data = {
			question_revision_id: question.id,
			response: response.length > 0 ? response : null,
			candidate,
			bookmarked
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

	const handleSubmit = async () => {
		if (isSubmitting) return;

		const answeredQuestion = currentSelection;
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		isSubmitting = true;
		saveStatus = 'saving';
		saveError = null;

		const previousState = JSON.parse(JSON.stringify(selections));
		const inputValue = String(candidateInput ?? '');

		if (answeredQuestion) {
			selections = selections.map((q) =>
				q.question_revision_id === question.id ? { ...q, response: inputValue } : q
			);
		} else {
			selections = [
				...selections,
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
			await submitAnswer(inputValue, currentBookmarked);
			saveStatus = 'saved';
		} catch (error) {
			selections = previousState;
			updateStore();
			saveStatus = 'idle';
			setTransientSaveError(error, 'Failed to save your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};

	const scheduleSave = () => {
		saveStatus = 'pending';
		flushFn = handleSubmit;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => handleSubmit(), 800);
	};

	$effect(() => {
		return () => {
			if (debounceTimer !== undefined && saveStatus === 'pending' && flushFn) {
				clearTimeout(debounceTimer);
				flushFn();
			}
		};
	});

	// Only used by the omr variant, which embeds its own "Clear answer" button
	// per-question (card variant defers to QuestionCard's shared button + setInput()).
	const clearAnswer = async () => {
		if (isSubmitting || !hasClearableAnswer) return;

		const answeredQuestion = currentSelection;
		if (!answeredQuestion) return;

		const currentBookmarked = answeredQuestion.bookmarked ?? false;
		const previousState = JSON.parse(JSON.stringify(selections));

		isSubmitting = true;
		saveError = null;

		selections = selections.map((selection) =>
			selection.question_revision_id === question.id
				? {
						...selection,
						response: '',
						visited: true,
						bookmarked: currentBookmarked,
						is_reviewed: false,
						correct_answer: undefined
					}
				: selection
		);
		updateStore();
		setInput('');

		try {
			await submitAnswer('', currentBookmarked);
		} catch (error) {
			selections = previousState;
			updateStore();
			const previousResponse = previousState.find(
				(selection: TSelection) => selection.question_revision_id === question.id
			)?.response;
			candidateInput = typeof previousResponse === 'string' ? previousResponse : '';
			setTransientSaveError(error, 'Failed to clear your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};
</script>

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

{#if variant === 'card'}
	<SaveErrorBanner message={saveError} {isSectionLimitWarning} class="mb-4" />
	{#if isLocked}
		{@const isCorrect = checkNumberAnswerCorrect()}
		{@const feedbackClass =
			isCorrect === null
				? 'border-border bg-card text-foreground'
				: isCorrect
					? 'border-success bg-success-subtle text-success'
					: 'border-error bg-error-subtle text-error'}
		{@const candidateResponse = currentSelection?.response}
		{@const correctAnswerValue = currentSelection?.correct_answer}
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
				<p class="w-full text-sm whitespace-pre-wrap">{correctAnswerValue}</p>
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
{:else}
	<div class="flex w-full flex-col gap-2">
		<SaveErrorBanner message={saveError} {isSectionLimitWarning} />
		<input
			type="number"
			step={question.question_type === question_type_enum.NUMERICALDECIMAL ? 'any' : '1'}
			class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			placeholder={$t('Type your answer here...')}
			value={candidateInput}
			oninput={(e) => {
				candidateInput = e.currentTarget.value;
				scheduleSave();
			}}
		/>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				{#if saveStatus === 'saving'}
					<span class="text-muted-foreground flex items-center gap-1 text-xs">
						<Spinner class="size-3" />{$t('Saving...')}
					</span>
				{:else if saveStatus === 'saved'}
					<span class="text-success flex items-center gap-1 text-xs">
						<Check class="size-3" />{$t('Saved')}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if question.subjective_answer_limit}
					{@const remaining = question.subjective_answer_limit - candidateInput.length}
					<span
						class="text-sm {remaining <= 0
							? 'text-destructive font-medium'
							: 'text-muted-foreground'}"
					>
						{remaining}
						{$t('characters remaining')}
					</span>
				{/if}
				<Button
					size="sm"
					variant="outline"
					onclick={clearAnswer}
					disabled={isSubmitting || !hasClearableAnswer}
				>
					{$t('Clear answer')}
				</Button>
			</div>
		</div>
	</div>
{/if}
