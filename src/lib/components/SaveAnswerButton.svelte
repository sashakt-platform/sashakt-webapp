<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { t } from 'svelte-i18n';

	let {
		onclick,
		disabled = false,
		hasUnsaved,
		hasSaved
	}: {
		onclick: () => void;
		disabled?: boolean;
		hasUnsaved: boolean;
		hasSaved: boolean;
	} = $props();
</script>

<Button size="sm" {onclick} disabled={disabled || !hasUnsaved}>
	{#if !hasUnsaved && hasSaved}
		<Check class="mr-1 h-4 w-4" />{$t('Saved')}
	{:else if hasSaved}
		{$t('Update Answer')}
	{:else}
		{$t('Save Answer')}
	{/if}
</Button>
