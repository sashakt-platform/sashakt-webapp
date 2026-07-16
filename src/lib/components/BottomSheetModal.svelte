<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { X } from '@lucide/svelte';
	import { t } from 'svelte-i18n';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: {
		open: boolean;
		title: string;
		children: Snippet;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		showCloseButton={false}
		class="data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom inset-x-0 top-auto right-0 bottom-0 left-0 flex max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-t-2xl rounded-b-none border-0 p-0 sm:max-w-none"
	>
		<Dialog.Title class="sr-only">{title}</Dialog.Title>

		<div class="bg-muted flex items-center justify-between rounded-t-2xl px-4 py-5">
			<h2 class="text-foreground text-base font-semibold">{title}</h2>
			<Dialog.Close class="text-muted-foreground hover:text-foreground" aria-label={$t('Close')}>
				<X class="size-5" />
			</Dialog.Close>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</div>
	</Dialog.Content>
</Dialog.Root>
