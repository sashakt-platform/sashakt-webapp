<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import type { TSelection } from '$lib/types';

	let { question, sNo, candidate, totalQuestions, selectedQuestions = $bindable() } = $props();

	const options = question.options;

	const selectedQuestion = (questionId: number) => {
		return selectedQuestions.find((item: TSelection) => item.question_revision_id === questionId);
	};

	const isSelected = (optionValue: string) => {
		const selected = selectedQuestion(question.id);
		return selected?.response === optionValue;
	};

	const handleSelection = (questionId: number, response: string) => {
		const answeredQuestion = selectedQuestion(questionId);

		if (answeredQuestion) {
			answeredQuestion.response = response;
		} else {
			selectedQuestions.push({
				question_revision_id: questionId,
				response,
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
			{sNo} <span>OF {totalQuestions}</span>
			<span class="text-muted-foreground float-end">{`1 Mark`}</span>
		</Card.Title>
		<Card.Description class="text-base/normal font-medium"
			>{question.question_text}{#if question.is_mandatory}<span class="ml-1 text-red-500">*</span>
			{/if}</Card.Description
		>
	</Card.Header>

	<Card.Content class="p-5 pt-1">
		<RadioGroup.Root
			onValueChange={(value) => {
				handleSelection(question.id, value);
				setTimeout(() => {
					submitAnswer();
				}, 500);
			}}
			value={selectedQuestion(question.id)?.response}
		>
			{#each options as option, index (index)}
				{@const optionKey = Object.keys(option)[0]}
				{@const optionValue = Object.values(option)[0]}
				{@const uid = `${question.id}-${optionKey}`}
				{#if optionKey && optionValue}
					<Label
						for={uid}
						class={`cursor-pointer space-x-2 rounded-xl border px-4 py-5 ${isSelected(optionValue.toString()) ? 'bg-primary text-muted *:border-muted *:text-muted' : ''}`}
					>
						{optionKey}. {optionValue}
						<RadioGroup.Item value={optionValue.toString()} id={uid} class="float-end" />
					</Label>
				{/if}
			{/each}
		</RadioGroup.Root>
	</Card.Content>
</Card.Root>
