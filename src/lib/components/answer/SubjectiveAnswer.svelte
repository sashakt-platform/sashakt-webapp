<script lang="ts">
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import {
		isSectionLimitError,
		createTransientSaveError,
		hasAttemptedResponse
	} from '$lib/helpers/answerErrorHelpers';
	import type { TCandidate, TQuestion, TSelection } from '$lib/types';
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
	// The "View Feedback" flow never triggers for subjective questions (they aren't
	// auto-graded), so this stays inert unless a caller (ViewFeedback) sets is_reviewed.
	const isFeedbackViewed = $derived(variant === 'card' && currentSelection?.is_reviewed === true);
	const isSectionLimitWarning = $derived(isSectionLimitError(saveError));

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

	const handleSubjectiveSubmit = async () => {
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
		flushFn = handleSubjectiveSubmit;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => handleSubjectiveSubmit(), 800);
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

{#if variant === 'card'}
	<SaveErrorBanner message={saveError} {isSectionLimitWarning} class="mb-4" />
	{#if isFeedbackViewed}
		<div class="rounded-xl border px-4 py-4">
			{#if typeof currentSelection?.response === 'string' && currentSelection.response.trim()}
				<p class="text-sm whitespace-pre-wrap">{currentSelection.response}</p>
			{:else}
				<p class="text-muted-foreground text-sm italic">{$t('Not Attempted')}</p>
			{/if}
		</div>
		{#if question.subjective_answer_limit}
			<p class="text-muted-foreground mt-2 text-xs">
				{$t('Up to {max} characters', { values: { max: question.subjective_answer_limit } })}
			</p>
		{/if}
	{:else}
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
							class="text-sm {remaining <= 0 ? 'text-error font-medium' : 'text-muted-foreground'}"
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
	{/if}
{:else}
	<div class="flex w-full flex-col gap-2">
		<SaveErrorBanner message={saveError} {isSectionLimitWarning} />
		<textarea
			style="field-sizing: content;"
			class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-30 w-full resize-none overflow-hidden rounded-xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			placeholder={$t('Type your answer here...')}
			value={candidateInput}
			oninput={(e) => {
				candidateInput = e.currentTarget.value;
				scheduleSave();
			}}
			maxlength={question.subjective_answer_limit || undefined}
		></textarea>
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
