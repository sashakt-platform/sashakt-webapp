<script lang="ts">
	import type { TFormField } from '$lib/types';
	import * as Select from '$lib/components/ui/select';
	import { t } from 'svelte-i18n';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: number) => void;
		locations: {
			states?: Array<{ id: number; name: string }>;
		};
	}

	let { field, value, onchange, locations }: Props = $props();

	// Use string for Select component, convert to/from number for external API
	let selectedValue = $state<string>(value !== undefined && value !== null ? String(value) : '');

	const options = $derived(locations.states?.map((s) => ({ id: s.id, label: s.name })) ?? []);

	const triggerContent = $derived(
		options.find((o) => String(o.id) === selectedValue)?.label ??
			field.placeholder ??
			$t('Select an option')
	);

	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		}
	});
</script>

<Select.Root
	type="single"
	name={field.name}
	bind:value={selectedValue}
	onValueChange={(v) => {
		if (v !== undefined && v !== '') {
			onchange(Number(v));
		}
	}}
>
	<Select.Trigger class="w-full">
		{triggerContent}
	</Select.Trigger>
	<Select.Content>
		<Select.Group>
			{#each options as option (option.id)}
				<Select.Item value={String(option.id)} label={option.label}>
					{option.label}
				</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
