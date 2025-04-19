<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import QuestionCard from '$lib/components/Question.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let isStarted = $state(false);
	let currentQues = $state(0);
</script>

<section>
	{#if !isStarted}
		<LandingPage {data} bind:isStarted />
	{:else}
		<div class="mx-auto max-w-xl">
			<QuestionCard ques={Questions[currentQues]} length={Questions.length} />
			<Pagination.Root
				count={Questions.length}
				perPage={1}
				class="fixed bottom-0 max-w-xl bg-white p-2"
			>
				{#snippet children({ currentPage })}
					<Pagination.Content class="flex w-full items-center justify-between">
						<Pagination.Item>
							<Pagination.PrevButton onclick={() => (currentQues = currentPage)} />
						</Pagination.Item>

						<Pagination.Item>
							{#if currentPage == Questions.length}
								<Button>Submit</Button>
							{:else}
								<Pagination.NextButton onclick={() => (currentQues = currentPage)} />
							{/if}
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	{/if}
</section>
