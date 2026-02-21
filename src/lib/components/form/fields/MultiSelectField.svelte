<script lang="ts">
	import type { TFormField } from '$lib/types';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: string[]) => void;
	}

	let { field, value, onchange }: Props = $props();

	let selectedValues = $state<string[]>(Array.isArray(value) ? value.map(String) : []);

	$effect(() => {
		if (Array.isArray(value)) {
			selectedValues = value.map(String);
		}
	});

	function handleToggle(optionValue: string, isChecked: boolean) {
		if (isChecked) {
			selectedValues = [...selectedValues, optionValue];
		} else {
			selectedValues = selectedValues.filter((v) => v !== optionValue);
		}
		onchange(selectedValues);
	}

	function isSelected(optionValue: string): boolean {
		return selectedValues.includes(optionValue);
	}
</script>

<div class="flex flex-col space-y-2">
	{#if field.options}
		{#each field.options as option (option.id)}
			<div class="flex items-center space-x-2">
				<Checkbox
					id={`${field.name}-${option.id}`}
					checked={isSelected(option.value)}
					onCheckedChange={(checked) => {
						if (typeof checked === 'boolean') handleToggle(option.value, checked);
					}}
				/>
				<Label for={`${field.name}-${option.id}`} class="cursor-pointer font-normal">
					{option.label}
				</Label>
			</div>
		{/each}
	{/if}
</div>
