<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';

	let { ques, length } = $props();
</script>

<Card.Root class="mb-5">
	<Card.Header>
		<Card.Title class="mb-2 border-b p-2 text-xs">
			<span>{ques['S No']} OF {length}</span>
			<span class="text-muted-foreground float-end">{`1 Mark`}</span>
		</Card.Title>
		<Card.Description class="text-base/normal">{ques.Questions}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			class="*:has-checked:bg-accent-foreground *:has-checked:text-accent flex w-full flex-col *:mb-1 *:rounded-lg *:border *:px-4 *:py-4 **:float-end"
		>
			<label for={ques['Option A']}>
				A. {ques['Option A']}
				<input type="radio" name={ques['S No']} id={ques['Option A']} value={ques['Option A']} />
			</label>

			<label for={ques['Option B']}>
				B. {ques['Option B']}
				<input type="radio" name={ques['S No']} id={ques['Option B']} value={ques['Option B']} />
			</label>

			<label for={ques['Option C']}>
				C. {ques['Option C']}
				<input type="radio" name={ques['S No']} id={ques['Option C']} value={ques['Option C']} />
			</label>

			<label for={ques['Option D']}>
				D. {ques['Option D']}
				<input type="radio" name={ques['S No']} id={ques['Option D']} value={ques['Option D']} />
			</label>
		</form>
	</Card.Content>
</Card.Root>
