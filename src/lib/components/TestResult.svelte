<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Table from '$lib/components/ui/table/index.js';

	let { resultData } = $props();
	const notAttempted = resultData.mandatory_not_attempted + resultData.optional_not_attempted;
	const attempted = resultData.correct_answer + resultData.incorrect_answer;
	const totalQuestions = notAttempted + attempted;
</script>

<section class="mx-auto mt-2 w-xs text-center">
	<img src="/circle-check.svg" alt="done" class="mx-auto mb-5 w-20" />
	<h6 class="text-accent-foreground mb-2 text-[10px] font-semibold uppercase">{`Test Name`}</h6>
	<h3 class="mb-1 text-lg font-semibold">Submitted Successfully</h3>
	<p class="text-sm/normal">
		Congrats on completing the test! You have attempted {attempted} questions.
	</p>
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
			<Table.Row class="font-semibold">
				<Table.Cell class="border-r">Total marks obtained</Table.Cell>
				<Table.Cell>{resultData.correct_answer} / {totalQuestions}</Table.Cell>
			</Table.Row>
		</Table.Body>
	</Table.Root>

	<form action="?/reattempt" method="POST" class="mt-8">
		<Button type="submit">Attempt again</Button>
	</form>
</section>
