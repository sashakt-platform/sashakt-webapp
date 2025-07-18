<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
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

	const selectedQuestion = (questionId: number) => {
		return selectedQuestions.find((item) => item.question_revision_id === questionId);
	};

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		return selected?.response.includes(optionId);
	};

	const handleSelection = (questionId: number, response: number) => {
		const answeredQuestion = selectedQuestion(questionId);

		if (answeredQuestion) {
			// for single choice type questions
			answeredQuestion.response = [response];
		} else {
			selectedQuestions.push({
				question_revision_id: questionId,
				response: [response],
				visited: true,
				time_spent: 0
			});
		}
	};

	const submitAnswer = async () => {
		try {
			return await fetch('/api/submit-answer', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...selectedQuestion(question.id),
					candidate
				})
			});
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
			<!-- <span class="text-muted-foreground float-end">{`1 Mark`}</span> -->
		</Card.Title>
		<Card.Description class="text-base/normal font-medium"
			>{question.question_text}{#if question.is_mandatory}<span class="ml-1 text-red-500">*</span>
			{/if}</Card.Description
		>
	</Card.Header>

	<Card.Content class="p-5 pt-1">
		<RadioGroup.Root
			onValueChange={(optionId) => {
				handleSelection(question.id, Number(optionId));
				submitAnswer();
			}}
			value={selectedQuestion(question.id)?.response[0].toString()}
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
	</Card.Content>
</Card.Root>
