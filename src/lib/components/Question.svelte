<script lang="ts">
	import Questions from '../../data/quest-data.json';
	import QuestionCard from './QuestionCard.svelte';
	import { Button } from './ui/button';
	import * as Pagination from './ui/pagination/index.js';

	let currentQues = $state(0);
</script>

<div class="mx-auto max-w-xl">
	<QuestionCard ques={Questions[currentQues]} length={Questions.length} />
	<Pagination.Root
		onPageChange={(p) => (currentQues = p - 1)}
		count={Questions.length}
		perPage={1}
		class="fixed bottom-0 max-w-xl bg-white p-2"
	>
		{#snippet children({ currentPage })}
			<Pagination.Content class="flex w-full items-center justify-between">
				<Pagination.PrevButton />

				{#if currentPage == Questions.length}
					<Button>Submit</Button>
				{:else}
					<Pagination.NextButton />
				{/if}
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>
</div>
