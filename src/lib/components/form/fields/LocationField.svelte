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
			districts?: Array<{ id: number; name: string; state_id: number }>;
			blocks?: Array<{ id: number; name: string; district_id: number }>;
		};
		selectedState?: number;
		selectedDistrict?: number;
	}

	let { field, value, onchange, locations, selectedState, selectedDistrict }: Props = $props();

	// Use string for Select component, convert to/from number for external API
	let selectedValue = $state<string>(value !== undefined && value !== null ? String(value) : '');

	// Filter options based on field type and parent selections
	const options = $derived.by(() => {
		if (field.field_type === 'state') {
			return locations.states?.map((s) => ({ id: s.id, label: s.name })) ?? [];
		}
		if (field.field_type === 'district') {
			const districts = locations.districts ?? [];
			if (selectedState) {
				return districts
					.filter((d) => d.state_id === selectedState)
					.map((d) => ({ id: d.id, label: d.name }));
			}
			return districts.map((d) => ({ id: d.id, label: d.name }));
		}
		if (field.field_type === 'block') {
			const blocks = locations.blocks ?? [];
			if (selectedDistrict) {
				return blocks
					.filter((b) => b.district_id === selectedDistrict)
					.map((b) => ({ id: b.id, label: b.name }));
			}
			return blocks.map((b) => ({ id: b.id, label: b.name }));
		}
		return [];
	});

	const triggerContent = $derived.by(() => {
		return (
			options.find((o) => String(o.id) === selectedValue)?.label ??
			field.placeholder ??
			$t('Select an option')
		);
	});

	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		}
	});

	// Reset selection when parent changes
	$effect(() => {
		if (field.field_type === 'district' && selectedState) {
			if (!options.find((o) => String(o.id) === selectedValue)) {
				selectedValue = '';
				onchange(0);
			}
		}
	});

	$effect(() => {
		if (field.field_type === 'block' && selectedDistrict) {
			if (!options.find((o) => String(o.id) === selectedValue)) {
				selectedValue = '';
				onchange(0);
			}
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
