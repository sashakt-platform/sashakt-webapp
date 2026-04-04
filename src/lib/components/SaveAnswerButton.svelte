<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Check from '@lucide/svelte/icons/check';
	import { t } from 'svelte-i18n';

	let {
		onclick = () => {},
		disabled,
		hasUnsavedChanges,
		hasSavedBefore
	}: {
		onclick?: () => void | Promise<void>;
		disabled: boolean;
		hasUnsavedChanges: boolean;
		hasSavedBefore: boolean;
	} = $props();
</script>

<Button size="sm" {onclick} {disabled}>
	{#if !hasUnsavedChanges && hasSavedBefore}
		<Check class="mr-1 h-4 w-4" />{$t('Saved')}
	{:else if hasSavedBefore}
		{$t('Update Answer')}
	{:else}
		{$t('Save Answer')}
	{/if}
</Button>
