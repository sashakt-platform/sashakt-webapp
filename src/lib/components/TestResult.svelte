<script lang="ts">
	// import { enhance } from '$app/forms';
	// import Button from '$lib/components/ui/button/button.svelte';
	import * as Table from '$lib/components/ui/table/index.js';

	let { resultData, testDetails } = $props();
	const totalQuestions = testDetails.total_questions;
	const attempted = resultData.correct_answer + resultData.incorrect_answer;
	const notAttempted = totalQuestions - attempted;
</script>

<section class="mx-auto mt-2 w-xs text-center">
	<img src="/circle-check.svg" alt="done" class="mx-auto mb-5 w-20" />
	<h6 class="text-accent-foreground mb-2 text-[10px] font-semibold uppercase">
		{testDetails.name}
	</h6>
	<h3 class="mb-1 text-lg font-semibold">Submitted Successfully</h3>
	<p class="text-sm/normal [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800">
		{#if testDetails.completion_message}
			{@html testDetails.completion_message}
		{:else}
			Congrats on completing the test! {#if resultData}
				You have attempted {attempted} questions.
			{:else}
				Your test has been submitted successfully.
			{/if}
		{/if}
	</p>
	{#if resultData}
		<p class="text-accent-foreground mt-4 border-b py-2 text-sm font-bold uppercase">
			Result summary
		</p>

		<Table.Root class="bg-accent mt-4 rounded-xl">
			<Table.Body>
				<Table.Row>
					<Table.Cell class="border-r">Correct Answers</Table.Cell>
					<Table.Cell>{resultData.correct_answer}</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell class="border-r">Incorrect Answers</Table.Cell>
					<Table.Cell>{resultData.incorrect_answer}</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell class="border-r">Not Attempted</Table.Cell>
					<Table.Cell>{notAttempted}</Table.Cell>
				</Table.Row>
				{#if resultData.marks_obtained !== null && resultData.marks_maximum !== null}
					<Table.Row class="font-semibold">
						<Table.Cell class="border-r">Total marks obtained</Table.Cell>
						<Table.Cell>{resultData.marks_obtained} / {resultData.marks_maximum}</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	{/if}

	<!-- <form action="?/reattempt" method="POST" class="mt-8" use:enhance>
		<Button type="submit">Attempt again</Button>
	</form> -->
</section>
