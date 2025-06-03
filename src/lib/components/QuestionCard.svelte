<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';

	let { question, SNo, totalQuestions, selectedQuestions = $bindable() } = $props();

	const options = question.options;

	const isSelected = (optionValue: string) => {
		const selected = selectedQuestions.find((item: any) => item.question === question.id);
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
		{SNo} <span>OF {totalQuestions}</span>
		<span class="text-muted-foreground float-end">{`1 Mark`}</span>
	</Card.Title>
	<Card.Description class="text-base/normal font-medium"
		>{question.question_text}{#if question.is_mandatory}<span class="ml-1 text-red-500">*</span>
		{/if}</Card.Description
	>
</Card.Header>
<Card.Content>
	<RadioGroup.Root
		onValueChange={(value) => {
			handleSelection(question.id, value);
		}}
		value={selectedQuestions.find((item: any) => item.question === question.id)?.response}
	>
		{#each options as option, index (index)}
			<Label
				for={Object.keys(option)[0]}
				class={`cursor-pointer space-x-2 rounded-md border px-4 py-5 ${isSelected(Object.values(option)[0]!.toString()) ? 'bg-primary text-muted *:border-muted *:text-muted' : ''}`}
			>
				{Object.keys(option)[0]}. {Object.values(option)[0]}
				<RadioGroup.Item
					value={Object.values(option)[0]!.toString()}
					id={Object.keys(option)[0]}
					class="float-end"
				/>
			</Label>
		{/each}
	</RadioGroup.Root>
</Card.Content>
