<script>
	import * as Table from '$lib/components/ui/table/index.js';
	import Button from './ui/button/button.svelte';
</script>

<section class="mx-auto mt-12 w-xs text-center">
	<img src="/circle-check.svg" alt="done" class="mx-auto mb-5 w-20" />
	<h6 class="text-accent-foreground mb-2 text-[10px] font-semibold uppercase">{`Test Name`}</h6>
	<h3 class="mb-1 text-lg font-semibold">Submitted Successfully</h3>
	<p class="text-sm/normal">
		Congrats on completing the test! You have attempted all the {`number`} questions.
	</p>
	<p class="text-accent-foreground mt-8 border-b py-2 text-sm font-bold uppercase">
		Result summary
	</p>

	<Table.Root class="bg-accent mt-4 rounded-xl">
		<Table.Body>
			<Table.Row>
				<Table.Cell class="border-r">Correct answers</Table.Cell>
				<Table.Cell>{32}</Table.Cell>
			</Table.Row>
			<Table.Row>
				<Table.Cell class="border-r">Incorrect answers</Table.Cell>
				<Table.Cell>{18}</Table.Cell>
			</Table.Row>
			<Table.Row class="font-semibold">
				<Table.Cell class="border-r">Total marks obtained</Table.Cell>
				<Table.Cell>{32} / {50}</Table.Cell>
			</Table.Row>
		</Table.Body>
	</Table.Root>

	<Button class="mt-15 w-40 text-lg/normal font-bold">Finish</Button>
</section>
