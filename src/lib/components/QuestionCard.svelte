<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import type { TCandidate, TQuestion, TSelection } from '$lib/types';

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

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		return selected?.response.includes(optionId);
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
				await submitAnswer(questionId, newResponse);

				// only update state on success
				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId
							? { ...q, response: newResponse, skipped: false }
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
							skipped: false
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
				const next = selectedQuestions
					.map((q) =>
						q.question_revision_id === questionId
							? { ...q, response: q.response.filter((id) => id !== optionId) }
							: q
					)
					.filter((q) => q.question_revision_id !== questionId || q.response.length > 0);
				selectedQuestions = next;
			} else {
				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId
							? { ...q, response: newResponse, skipped: false }
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
							skipped: false
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

	const submitAnswer = async (questionId: number, response: number[]) => {
		const data = {
			question_revision_id: questionId,
			response,
			candidate
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

	const handleSkip = () => {
		const answeredQuestion = selectedQuestion(question.id);

		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id ? { ...q, skipped: true, visited: true } : q
			);
		} else {
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: [],
					visited: true,
					time_spent: 0,
					skipped: true
				}
			];
		}
		updateStore();
	};

	const isQuestionAnswered = $derived(selectedQuestion(question.id)?.response?.length ?? 0 > 0);

	const isQuestionSkipped = $derived(selectedQuestion(question.id)?.skipped ?? false);
</script>

<Card.Root
	class="mb-4 w-82 rounded-xl shadow-md {isSubmitting ? 'pointer-events-none opacity-60' : ''}"
>
	<Card.Header class="p-5">
		<Card.Title class="mb-5 border-b pb-3 text-sm">
			{serialNumber} <span>OF {totalQuestions}</span>
			{#if question?.marking_scheme}
				{@const mark = question.marking_scheme.correct}
				<span class="text-muted-foreground float-end"
					>{mark === 1 ? '1 Mark' : `${mark} Marks`}</span
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

		{#if !isQuestionAnswered && !isQuestionSkipped}
			<Button variant="outline" class="mt-4 w-full" onclick={handleSkip}>Skip</Button>
		{:else if isQuestionSkipped}
			<p class="text-muted-foreground mt-4 text-center text-sm">Skipped</p>
		{/if}
	</Card.Content>
</Card.Root>
