<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';

	let { question, totalQuestions, selectedQuestions = $bindable() } = $props();

	const options = ['Option A', 'Option B', 'Option C', 'Option D'];

	const isSelected = (optionValue: string) => {
		const selected = selectedQuestions.find((item: any) => item.question === question['S No']);
		return selected?.response === optionValue;
	};

	const handleSelection = (question: string, response: string) => {
		const index = selectedQuestions?.findIndex((item: any) => item.question === question);

		if (index !== -1) {
			selectedQuestions[index].response = response;
		} else {
			selectedQuestions.push({ question, response });
		}
	};
</script>

<Card.Header>
	<Card.Title class="mb-6 border-b p-4 text-sm">
		{question['S No']} <span>OF {totalQuestions}</span>
		<span class="text-muted-foreground float-end">{`1 Mark`}</span>
	</Card.Title>
	<Card.Description class="text-base/normal font-medium">{question.Questions}</Card.Description>
</Card.Header>
<Card.Content>
	<RadioGroup.Root
		onValueChange={(value) => {
			handleSelection(question['S No'], value);
		}}
		value={selectedQuestions.find((item: any) => item.question === question['S No'])?.response}
	>
		{#each options as option, index (index)}
			<Label
				for={options[index]}
				class={`cursor-pointer space-x-2 rounded-md border px-4 py-5 ${isSelected(question[option]) ? 'bg-accent-foreground text-muted *:border-muted *:text-muted' : ''}`}
			>
				{String.fromCharCode(65 + index)}. {question[option]}
				<RadioGroup.Item value={question[option]} id={options[index]} class="float-end" />
			</Label>
		{/each}
	</RadioGroup.Root>
</Card.Content>
