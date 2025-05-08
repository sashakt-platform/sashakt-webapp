<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Button from './ui/button/button.svelte';

	let { question, totalQuestions, selectedQuestions, handleSelection } = $props();

	const options = ['Option A', 'Option B', 'Option C', 'Option D'];

	const isSelected = (optionIndex: number) => {
		const selected = selectedQuestions.find((item) => item.question === question['S No']);
		return selected?.selection === optionIndex + 1;
	};
</script>

<Card.Root class="mb-5">
	<Card.Header>
		<Card.Title class="mb-2 border-b p-2 text-xs">
			<span>{question['S No']} OF {totalQuestions}</span>
			<span class="text-muted-foreground float-end">{`1 Mark`}</span>
		</Card.Title>
		<Card.Description class="text-base/normal">{question.Questions}</Card.Description>
	</Card.Header>
	<Card.Content>
		<div class="flex flex-col space-y-1">
			{#each options as option, index (index)}
				<Button
					variant={isSelected(index) ? 'default' : 'secondary'}
					class="justify-start"
					onclick={() => handleSelection({ question: question['S No'], selection: index + 1 })}
				>
					{String.fromCharCode(65 + index)}.
					{question[option]}
				</Button>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
