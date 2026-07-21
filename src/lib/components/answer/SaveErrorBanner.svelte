<script lang="ts">
	import { t } from 'svelte-i18n';
	import { cn } from '$lib/utils';

	let {
		message,
		isSectionLimitWarning,
		class: className = ''
	}: {
		message: string | null;
		isSectionLimitWarning: boolean;
		class?: string;
	} = $props();
</script>

{#if message}
	<div
		class={cn(
			'rounded-lg border p-3 text-sm',
			isSectionLimitWarning
				? 'border-warning bg-warning-subtle text-warning'
				: 'border-destructive bg-destructive/10 text-destructive',
			className
		)}
	>
		{message}
		{#if isSectionLimitWarning}
			<p class="text-warning mt-2 text-xs">
				{$t('Clear another answered question in this section to attempt this one.')}
			</p>
		{/if}
	</div>
{/if}
