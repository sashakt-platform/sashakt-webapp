<script lang="ts">
	import List from '@lucide/svelte/icons/list';

	let {
		remainingMandatoryCount,
		onclick
	}: {
		remainingMandatoryCount: number;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	class="bg-primary/10 fixed right-4 bottom-16 z-20 flex h-14 w-14 items-center justify-center rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
	{onclick}
	aria-label="Open question palette"
>
	<List class="text-primary h-6 w-6" />

	{#if remainingMandatoryCount > 0}
		<span
			class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white"
		>
			{remainingMandatoryCount}
		</span>
	{/if}
</button>
