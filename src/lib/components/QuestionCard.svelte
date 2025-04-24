<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	let { question, totalQuestions } = $props();
	const options = ['Option A', 'Option B', 'Option C', 'Option D'];
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
		<form
			class="*:has-checked:bg-accent-foreground *:has-checked:text-accent flex w-full flex-col *:mb-1 *:rounded-lg *:border *:px-4 *:py-4 **:float-end"
		>
			{#each options as option, index (index)}
				<label for={question[option]}>
					{String.fromCharCode(65 + index)}.
					{question[option]}
					<input
						type="radio"
						id={question[option]}
						value={question[option]}
						name={question['S No']}
					/>
				</label>
			{/each}
		</form>
	</Card.Content>
</Card.Root>
