<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { TFormField } from '$lib/types';
	import { t } from 'svelte-i18n';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { cn } from '$lib/utils.js';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: string) => void;
	}

	let { field, value, onchange }: Props = $props();

	let open = $state(false);
	let selectedValue = $state<string>(String(value ?? field.default_value ?? ''));

	const selectedLabel = $derived(
		field.options?.find((opt) => opt.value === selectedValue)?.label ?? ''
	);

	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		}
	});

	function handleSelect(optionValue: string) {
		selectedValue = optionValue;
		onchange(optionValue);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class="w-full justify-between font-normal"
				role="combobox"
				aria-expanded={open}
			>
				<span class="truncate">
					{selectedLabel || field.placeholder || $t('Select an option')}
				</span>
				<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[--bits-popover-anchor-width] p-0" align="start">
		<Command.Root>
			<Command.Input placeholder={$t('Type to search...')} />
			<Command.List>
				<Command.Empty>{$t('No results found')}</Command.Empty>
				{#if field.options}
					<Command.Group>
						{#each field.options as option (option.id)}
							<Command.Item value={option.label} onSelect={() => handleSelect(option.value)}>
								<CheckIcon
									class={cn('mr-2 size-4', selectedValue !== option.value && 'text-transparent')}
								/>
								{option.label}
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
