<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
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

	const removeOption = async (questionId: number, optionId: number) => {
		const answeredQuestion = selectedQuestion(questionId);
		if (!answeredQuestion) return;

		// store the current state before making changes
		const previousState = JSON.parse(JSON.stringify(selectedQuestions));

		// update UI first
		const next = selectedQuestions
			.map((q) =>
				q.question_revision_id === questionId
					? { ...q, response: q.response.filter((id) => id !== optionId) }
					: q
			)
			// prune the question if response became empty
			.filter((q) => q.question_revision_id !== questionId || q.response.length > 0);

		selectedQuestions = next;
		updateStore();

		// calculate new response after removing the option
		const newResponse = answeredQuestion.response.filter((id) => id !== optionId);

		try {
			await submitAnswer(questionId, newResponse);
		} catch (error) {
			// revert to previous state on error
			selectedQuestions = previousState;
			updateStore();
			alert('Failed to save your answer. Please try again.');
		}
	};

	const handleSelection = async (questionId: number, optionId: number) => {
		// store the current state before making changes
		const previousState = JSON.parse(JSON.stringify(selectedQuestions));

		// update UI first
		const answeredQuestion = selectedQuestion(questionId);
		if (answeredQuestion) {
			if (question.question_type === 'single-choice') {
				answeredQuestion.response = [optionId];
			} else {
				answeredQuestion.response = [...answeredQuestion.response, optionId];
			}
		} else {
			selectedQuestions.push({
				question_revision_id: questionId,
				response: [optionId],
				visited: true,
				time_spent: 0
			});
		}
		updateStore();

		try {
			await submitAnswer(questionId, answeredQuestion?.response || [optionId]);
		} catch (error) {
			// revert to previous state on error
			selectedQuestions = previousState;
			updateStore();
			alert('Failed to save your answer. Please try again.');
		}
	};

	const submitAnswer = async (questionId: number, response: number[]) => {
		const data = {
			question_revision_id: questionId,
			response,
			candidate
		};

		try {
			const res = await fetch('/api/submit-answer', {
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
</script>

<Card.Root class="mb-4 w-82 rounded-xl shadow-md">
	<Card.Header class="p-5">
		<Card.Title class="mb-5 border-b pb-3 text-sm">
			{serialNumber} <span>OF {totalQuestions}</span>
			{#if question?.marking_scheme}
				{@const mark = question.marking_scheme.correct}
				<span class="text-muted-foreground float-end"
					>{mark === 1 ? '1 Mark' : `${mark} Marks`}</span
				>
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
		{#if question.question_type === 'single-choice'}
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
		{:else}
			{#each options as option (option.id)}
				{@const uid = `${question.id}-${option.key}`}

				{@const checked = isSelected(option.id)}
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
								if (check === false) await removeOption(question.id, option.id);
								else if (check === true) await handleSelection(question.id, option.id);
							}}
						/>
					</Label>
				</div>
			{/each}
		{/if}
	</Card.Content>
</Card.Root>
