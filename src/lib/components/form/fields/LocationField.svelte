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
		onchange: (value: number) => void;
		locations: {
			states?: Array<{ id: number; name: string }>;
		};
	}

	let { field, value, onchange, locations }: Props = $props();

	let open = $state(false);
	let selectedValue = $state<string>(value !== undefined && value !== null ? String(value) : '');

	const options = $derived(locations.states?.map((s) => ({ id: s.id, label: s.name })) ?? []);

	const selectedLabel = $derived(options.find((o) => String(o.id) === selectedValue)?.label ?? '');

	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		}
	});

	function handleSelect(optionId: number) {
		selectedValue = String(optionId);
		onchange(optionId);
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
				<Command.Group>
					{#each options as option (option.id)}
						<Command.Item value={option.label} onSelect={() => handleSelect(option.id)}>
							<CheckIcon
								class={cn('mr-2 size-4', selectedValue !== String(option.id) && 'text-transparent')}
							/>
							{option.label}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
