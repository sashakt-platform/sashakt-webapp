<script lang="ts">
	import { page } from '$app/state';
	import Bookmark from '@lucide/svelte/icons/bookmark';
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

	const getExistingTextResponse = () => {
		const selected = selectedQuestion(question.id);
		return typeof selected?.response === 'string' ? selected.response : '';
	};
	let subjectiveText = $state(getExistingTextResponse());

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		if (!selected || typeof selected.response === 'string') return false;
		return selected.response.includes(optionId);
	};

	const updateStore = () => {
		sessionStore.current = {
			...sessionStore.current,
			candidate,
			selections: [...selectedQuestions]
		};
	};

	const handleSelection = async (questionId: number, optionId: number, isRemoving = false) => {
		const answeredQuestion = selectedQuestion(questionId);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		// calculate the new response
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

				// only update state on success
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
							bookmarked: false
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
							bookmarked: false
						}
					];
				}
			}
			updateStore();

			try {
				await submitAnswer(questionId, newResponse);
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

	const submitAnswer = async (
		questionId: number,
		response: number[] | string,
		bookmarked?: boolean
	) => {
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
		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;
		const newBookmarked = !currentBookmarked;
		const currentResponse = answeredQuestion?.response;

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
			const defaultResponse = question.question_type === 'subjective' ? '' : [];
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: defaultResponse,
					visited: true,
					time_spent: 0,
					bookmarked: newBookmarked
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
			saveError = 'Failed to save bookmark. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};

	const isQuestionBookmarked = $derived(selectedQuestion(question.id)?.bookmarked ?? false);

	const handleSubjectiveSubmit = async () => {
		if (isSubmitting) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		isSubmitting = true;
		saveError = null;

		const previousState = JSON.parse(JSON.stringify(selectedQuestions));

		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id ? { ...q, response: subjectiveText } : q
			);
		} else {
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: subjectiveText,
					visited: true,
					time_spent: 0,
					bookmarked: false
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, subjectiveText, currentBookmarked);
		} catch (error) {
			selectedQuestions = previousState;
			updateStore();
			saveError = 'Failed to save your answer. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};
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
					value={(() => {
						const resp = selectedQuestion(question.id)?.response;
						return typeof resp !== 'string' ? resp?.[0]?.toString() : undefined;
					})()}
				>
					{#each options as option, index (index)}
						{@const uid = `${question.id}-${option.key}`}
						<Label
							for={uid}
							class={`cursor-pointer space-x-2 rounded-xl border px-4 py-5 ${isSelected(option.id) ? 'bg-primary text-muted *:border-muted *:text-muted' : ''}`}
						>
							{option.key}. {option.value}
							<RadioGroup.Item value={option.id.toString()} id={uid} class="float-end" />
						</Label>
					{/each}
				</RadioGroup.Root>
			{/key}
		{:else if question.question_type === 'subjective'}
			<div class="flex flex-col gap-2">
				<textarea
					class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-30 w-full rounded-xl border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					placeholder={$t('Type your answer here...')}
					bind:value={subjectiveText}
					maxlength={question.subjective_answer_limit || undefined}
				></textarea>
				<div class="flex items-center justify-between">
					{#if question.subjective_answer_limit}
						<span class="text-muted-foreground text-sm">
							{subjectiveText.length}/{question.subjective_answer_limit}
							{$t('characters')}
						</span>
					{:else}
						<span></span>
					{/if}
					<Button
						variant="default"
						size="sm"
						onclick={handleSubjectiveSubmit}
						disabled={isSubmitting || !subjectiveText.trim()}
					>
						{$t('Save Answer')}
					</Button>
				</div>
			</div>
		{:else}
			{#each options as option (option.id)}
				{@const uid = `${question.id}-${option.key}`}
				<div class="flex flex-row items-start space-x-3">
					<Label
						for={uid}
						class={`mb-2 w-full cursor-pointer rounded-xl border px-4 py-5 ${isSelected(option.id) ? 'bg-primary text-muted *:border-muted *:text-muted' : ''}`}
					>
						{option.key}. {option.value}
						<Checkbox
							id={uid}
							value={option.id.toString()}
							class="float-end"
							checked={isSelected(option.id)}
							onCheckedChange={async (check) => {
								await handleSelection(question.id, option.id, check === false);
							}}
						/>
					</Label>
				</div>
			{/each}
		{/if}

		<Button
			variant="outline"
			class="mt-4 w-full {isQuestionBookmarked
				? 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'
				: ''}"
			onclick={handleBookmark}
		>
			<Bookmark class="mr-2 h-4 w-4 {isQuestionBookmarked ? 'fill-amber-500' : ''}" />
			{isQuestionBookmarked ? $t('Unmark for review') : $t('Mark for review')}
		</Button>
	</Card.Content>
</Card.Root>
