<script lang="ts">
	import { page } from '$app/state';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import type { TCandidate, TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		question,
		serialNumber,
		candidate,
		totalQuestions,
		selectedQuestions = $bindable()
	}: {
		question: TQuestion;
		candidate: TCandidate;
		serialNumber: number;
		totalQuestions: number;
		selectedQuestions: TSelection[];
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
	const hasFeedbackAvailable = $derived(
		(currentSelection?.response?.length ?? 0) > 0 &&
			currentSelection?.correct_answer != null &&
			currentSelection.correct_answer.length > 0
	);
	const isFeedbackViewed = $derived(currentSelection?.feedbackViewed === true);
	const isLocked = $derived(isFeedbackViewed);

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		return selected?.response.includes(optionId);
	};

	const optionFeedbackClass = (optionId: number) => {
		if (!isFeedbackViewed || !currentSelection?.correct_answer) return '';
		if (currentSelection.correct_answer.includes(optionId)) {
			return 'bg-green-100 border-green-500 text-green-700';
		}
		if (currentSelection.response.includes(optionId)) {
			return 'bg-red-100 border-red-500 text-red-700';
		}
		return '';
	};

	const getOptionFeedbackStatus = (optionId: number): 'correct' | 'wrong' | 'none' => {
		if (!isFeedbackViewed || !currentSelection?.correct_answer) return 'none';
		if (currentSelection.correct_answer.includes(optionId)) return 'correct';
		if (currentSelection.response.includes(optionId)) return 'wrong';
		return 'none';
	};

	const updateStore = () => {
		sessionStore.current = {
			...sessionStore.current,
			candidate,
			selections: selectedQuestions.map(({ correct_answer, ...rest }) => rest)
		};
	};

	const confirmViewFeedback = () => {
		selectedQuestions = selectedQuestions.map((q) =>
			q.question_revision_id === question.id ? { ...q, feedbackViewed: true } : q
		);
		updateStore();
	};

	const handleSelection = async (questionId: number, optionId: number, isRemoving = false) => {
		if (isLocked) return;

		const answeredQuestion = selectedQuestion(questionId);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		// calculate the new response
		let newResponse: number[];
		if (isRemoving) {
			if (!answeredQuestion) return;
			newResponse = answeredQuestion.response.filter((id) => id !== optionId);
		} else {
			if (question.question_type === 'single-choice') {
				newResponse = [optionId];
			} else {
				newResponse = answeredQuestion ? [...answeredQuestion.response, optionId] : [optionId];
			}
		}

		if (question.question_type === 'single-choice' && !isRemoving) {
			if (isSubmitting) {
				return;
			}
			isSubmitting = true;
			saveError = null;
			try {
				const result = await submitAnswer(questionId, newResponse, currentBookmarked);

				// only update state on success
				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId
							? {
									...q,
									response: newResponse,
									correct_answer: result?.correct_answer ?? q.correct_answer
								}
							: q
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
							correct_answer: result?.correct_answer ?? null
						}
					];
				}
				updateStore();
			} catch (error) {
				// force complete remount of RadioGroup
				radioGroupKey++;
				saveError = 'Failed to save your answer. Please try again.';
				// clear error after 5 seconds
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
					q.question_revision_id === questionId
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
							bookmarked: currentBookmarked
						}
					];
				}
			}
			updateStore();

			try {
				const result = await submitAnswer(questionId, newResponse);

				if (result?.correct_answer != null) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId
							? { ...q, correct_answer: result.correct_answer }
							: q
					);
					updateStore();
				}
			} catch (error) {
				// revert on error
				selectedQuestions = previousState;
				updateStore();
				saveError = 'Failed to save your answer. Please try again.';
				// clear error after 5 seconds
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		}
	};

	const submitAnswer = async (questionId: number, response: number[], bookmarked?: boolean) => {
		const data = {
			question_revision_id: questionId,
			response: response.length > 0 ? response : null,
			candidate,
			bookmarked
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
		const currentResponse = answeredQuestion?.response ?? [];

		if (isSubmitting) return;
		isSubmitting = true;
		saveError = null;

		// optimistically update UI
		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id
					? { ...q, bookmarked: newBookmarked, visited: true }
					: q
			);
		} else {
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: [],
					visited: true,
					time_spent: 0,
					bookmarked: newBookmarked
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, currentResponse, newBookmarked);
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
			saveError = 'Failed to save bookmark. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};

	const isQuestionAnswered = $derived((selectedQuestion(question.id)?.response?.length ?? 0) > 0);
	const isQuestionBookmarked = $derived(selectedQuestion(question.id)?.bookmarked ?? false);
</script>

<Card.Root
	class="mb-4 w-full rounded-xl shadow-md {isSubmitting ? 'pointer-events-none opacity-60' : ''}"
>
	<Card.Header class="p-5">
		<Card.Title class="mb-5 border-b pb-3 text-sm">
			{serialNumber} <span>{$t('OF')} {totalQuestions}</span>
			{#if question?.marking_scheme}
				{@const mark = question.marking_scheme.correct}
				<span class="text-muted-foreground float-end"
					>{mark === 1 ? `1 ${$t('Mark')}` : `${mark} ${$t('Marks')}`}</span
				>
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
		{#if question.question_type === 'single-choice'}
			{#key radioGroupKey}
				<RadioGroup.Root
					onValueChange={async (optionId) => {
						await handleSelection(question.id, Number(optionId));
					}}
					value={selectedQuestion(question.id)?.response[0]?.toString()}
					disabled={isLocked}
				>
					{#each options as option, index (index)}
						{@const uid = `${question.id}-${option.key}`}
						{@const feedbackClass = optionFeedbackClass(option.id)}
						{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
						<Label
							for={uid}
							class={`cursor-pointer space-x-2 rounded-xl border px-4 py-5 ${
								isFeedbackViewed
									? feedbackClass || ''
									: isSelected(option.id)
										? 'bg-primary text-muted *:border-muted *:text-muted'
										: ''
							} ${isLocked ? 'cursor-not-allowed' : ''}`}
						>
							<span>{option.key}. {option.value}</span>
							<div class="float-end flex h-6 w-6 items-center justify-center">
								{#if feedbackStatus === 'correct'}
									<Check size={18} class="text-green-600" />
								{:else if feedbackStatus === 'wrong'}
									<X size={18} class="text-red-600" />
								{:else}
									<RadioGroup.Item value={option.id.toString()} id={uid} disabled={isLocked} />
								{/if}
							</div>
						</Label>
					{/each}
				</RadioGroup.Root>
			{/key}
		{:else}
			{#each options as option (option.id)}
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
						<span>{option.key}. {option.value}</span>
						<div class="float-end flex h-6 w-6 items-center justify-center">
							{#if feedbackStatus === 'correct'}
								<Check size={18} class="text-green-600" />
							{:else if feedbackStatus === 'wrong'}
								<X size={18} class="text-red-600" />
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
					</Label>
				</div>
			{/each}
		{/if}

		{#if hasFeedbackAvailable && !isFeedbackViewed}
			<Button
				variant="outline"
				class="mt-4 w-full border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
				onclick={confirmViewFeedback}
			>
				{$t('View Feedback')}
			</Button>
		{/if}

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
	</Card.Content>
</Card.Root>
