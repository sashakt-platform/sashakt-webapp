<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import * as Dialog from '$lib/components/ui/dialog';
	import RichText from '$lib/components/RichText.svelte';
	import { t } from 'svelte-i18n';
	let {
		instructions,
		iconOnly = false
	}: {
		instructions: string | undefined;
		iconOnly?: boolean;
	} = $props();

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#if iconOnly}
			<button
				type="button"
				class="border-border flex h-9 w-9 items-center justify-center rounded-lg border"
				aria-label={$t('Instructions')}
			>
				<Info class="text-muted-foreground h-5 w-5" />
			</button>
		{:else}
			<button
				type="button"
				class="border-border bg-card text-card-foreground flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
			>
				<Info class="text-muted-foreground h-5 w-5" />
				{$t('Instructions')}
			</button>
		{/if}
	</Dialog.Trigger>
	<Dialog.Content class="max-h-[80vh] w-[90vw] max-w-lg overflow-hidden rounded-xl">
		<Dialog.Header>
			<Dialog.Title>
				{$t('Instructions')}
			</Dialog.Title>
		</Dialog.Header>
		<div class="max-h-[60vh] overflow-y-auto">
			{#if instructions}
				<RichText content={instructions} class="prose prose-sm max-w-none" />
			{:else}
				<p class="text-muted-foreground text-center">{$t('No instructions available.')}</p>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
