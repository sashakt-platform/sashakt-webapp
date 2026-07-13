<script lang="ts">
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import {
		question_type_enum,
		type TCandidate,
		type TOptions,
		type TQuestion,
		type TSelection
	} from '$lib/types';
	import { t } from 'svelte-i18n';
	import { cn } from '$lib/utils';
	import RichText from '../RichText.svelte';
	import QuestionMedia from '../QuestionMedia.svelte';

	let {
		question,
		candidate,
		selections = $bindable(),
		variant,
		radioGroupKey = $bindable(0),
		isSubmitting = $bindable(false)
	}: {
		question: TQuestion;
		candidate: TCandidate;
		selections: TSelection[];
		variant: 'card' | 'omr';
		radioGroupKey?: number;
		isSubmitting?: boolean;
	} = $props();

	const SECTION_LIMIT_ERROR_PREFIX = 'Maximum attempt limit reached for section';
	const options = question.options as TOptions[];
	const sessionStore = createTestSessionStore(candidate);

	let saveError = $state<string | null>(null);

	const currentSelection = $derived(
		selections.find((item) => item.question_revision_id === question.id)
	);
	const correctAnswer = $derived(currentSelection?.correct_answer ?? null);
	// OMR mode never surfaces feedback, so this stays inert there.
	const isFeedbackViewed = $derived(variant === 'card' && currentSelection?.is_reviewed === true);
	const isLocked = $derived(isFeedbackViewed);
	const isSectionLimitWarning = $derived(saveError?.includes(SECTION_LIMIT_ERROR_PREFIX) ?? false);

	const hasAttemptedResponse = (response: number[] | string | undefined | null): boolean => {
		if (typeof response === 'string') return response.trim().length > 0;
		return (response?.length ?? 0) > 0;
	};
	const hasClearableAnswer = $derived(hasAttemptedResponse(currentSelection?.response));

	const isSelected = (optionId: number) => {
		return (
			Array.isArray(currentSelection?.response) && currentSelection.response.includes(optionId)
		);
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

	const getErrorMessage = (error: unknown, fallback: string) =>
		error instanceof Error && error.message ? error.message : fallback;

	const setTransientSaveError = (error: unknown, fallback: string) => {
		saveError = getErrorMessage(error, fallback);
		setTimeout(() => (saveError = null), 5000);
	};

	const updateStore = () => {
		sessionStore.current = { ...sessionStore.current, candidate, selections };
	};

	const submitAnswer = async (response: number[] | null, bookmarked?: boolean) => {
		const data = {
			question_revision_id: question.id,
			response: response == null ? null : response.length > 0 ? response : null,
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

	const handleSelection = async (optionId: number, isRemoving = false) => {
		if (isLocked) return;

		const answeredQuestion = currentSelection;
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		let newResponse: number[];
		if (isRemoving) {
			if (!answeredQuestion || typeof answeredQuestion.response === 'string') return;
			newResponse = answeredQuestion.response.filter((id) => id !== optionId);
		} else if (question.question_type === question_type_enum.SINGLE) {
			newResponse = [optionId];
		} else {
			const existingResponse =
				answeredQuestion && typeof answeredQuestion.response !== 'string'
					? answeredQuestion.response
					: [];
			newResponse = [...existingResponse, optionId];
		}

		if (variant === 'card' && question.question_type === question_type_enum.SINGLE && !isRemoving) {
			if (isSubmitting) return;
			isSubmitting = true;
			saveError = null;
			try {
				await submitAnswer(newResponse, currentBookmarked);
				if (answeredQuestion) {
					selections = selections.map((q) =>
						q.question_revision_id === question.id ? { ...q, response: newResponse } : q
					);
				} else {
					selections = [
						...selections,
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
				updateStore();
			} catch (error) {
				// force complete remount of RadioGroup so the unsaved selection doesn't stay checked
				radioGroupKey++;
				setTransientSaveError(error, 'Failed to save your answer. Please try again.');
			} finally {
				isSubmitting = false;
			}
		} else {
			if (isSubmitting) return;
			isSubmitting = true;
			saveError = null;
			const previousState = JSON.parse(JSON.stringify(selections));

			if (isRemoving) {
				selections = selections.map((q) =>
					q.question_revision_id === question.id && typeof q.response !== 'string'
						? { ...q, response: q.response.filter((id) => id !== optionId) }
						: q
				);
			} else if (answeredQuestion) {
				selections = selections.map((q) =>
					q.question_revision_id === question.id ? { ...q, response: newResponse } : q
				);
			} else {
				selections = [
					...selections,
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
			updateStore();

			try {
				await submitAnswer(newResponse, currentBookmarked);
			} catch (error) {
				selections = previousState;
				updateStore();
				setTransientSaveError(error, 'Failed to save your answer. Please try again.');
			} finally {
				isSubmitting = false;
			}
		}
	};

	const clearAnswer = async () => {
		if (isSubmitting || !hasClearableAnswer) return;
		if (isLocked) return;

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
						response: [],
						visited: true,
						bookmarked: currentBookmarked,
						is_reviewed: false,
						correct_answer: undefined
					}
				: selection
		);
		updateStore();

		try {
			await submitAnswer([], currentBookmarked);
			if (variant === 'card' && question.question_type === question_type_enum.SINGLE) {
				radioGroupKey++;
			}
		} catch (error) {
			selections = previousState;
			updateStore();
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
					await handleSelection(Number(optionId));
				}}
				value={(() => {
					const resp = currentSelection?.response;
					return typeof resp !== 'string' ? resp?.[0]?.toString() : undefined;
				})()}
				disabled={isLocked}
				class="flex flex-col gap-3"
			>
				{#each options as option, index (index)}
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
	{:else}
		<div class="flex flex-col gap-3">
			{#each options as option (option.id)}
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
									await handleSelection(option.id, check === false);
								}}
								class={cn(
									feedbackStatus === 'correct' && 'border-success data-[state=checked]:bg-success',
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
{:else}
	<div class="w-full space-y-3">
		{#if question.question_type === question_type_enum.SINGLE}
			<RadioGroup.Root
				class="grid grid-cols-4 gap-2 sm:gap-3"
				orientation="horizontal"
				onValueChange={async (optionId) => {
					await handleSelection(Number(optionId));
				}}
				value={Array.isArray(currentSelection?.response)
					? currentSelection.response[0]?.toString()
					: undefined}
			>
				{#each options as option (option.id)}
					{@const uid = `omr-${question.id}-${option.key}`}
					<Label
						for={uid}
						class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm sm:px-5 sm:py-4 sm:text-base {isSelected(
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
		{:else}
			<div class="grid grid-cols-4 gap-2 sm:gap-3">
				{#each options as option (option.id)}
					{@const uid = `omr-${question.id}-${option.key}`}
					<Label
						for={uid}
						class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm sm:px-5 sm:py-4 sm:text-base {isSelected(
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
							checked={isSelected(option.id)}
							onCheckedChange={async (check) => {
								await handleSelection(option.id, check === false);
							}}
						/>
					</Label>
				{/each}
			</div>
		{/if}
		<div class="flex justify-end">
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
{/if}
