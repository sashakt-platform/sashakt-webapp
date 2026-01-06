<script lang="ts">
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		instructions
	}: {
		instructions: string | undefined;
	} = $props();

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<button
			type="button"
			class="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-200"
		>
			<CircleHelp class="h-5 w-5" />
			Instructions
		</button>
	</Dialog.Trigger>
	<Dialog.Content class="max-h-[80vh] w-[90vw] max-w-lg overflow-hidden rounded-xl">
		<Dialog.Header>
			<Dialog.Title>Instructions</Dialog.Title>
		</Dialog.Header>
		<div class="max-h-[60vh] overflow-y-auto">
			{#if instructions}
				<div class="prose prose-sm max-w-none">
					{@html instructions}
				</div>
			{:else}
				<p class="text-muted-foreground text-center">No instructions available.</p>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
