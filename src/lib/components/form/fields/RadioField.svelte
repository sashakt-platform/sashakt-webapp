<script lang="ts">
	import type { TFormField } from '$lib/types';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: string) => void;
	}

	let { field, value, onchange }: Props = $props();

	let selectedValue = $state<string>(String(value ?? field.default_value ?? ''));

	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		}
	});
</script>

<RadioGroup.Root
	name={field.name}
	bind:value={selectedValue}
	onValueChange={(v) => {
		if (v !== undefined) {
			onchange(v);
		}
	}}
	class="flex flex-col space-y-2"
>
	{#if field.options}
		{#each field.options as option (option.id)}
			<div class="flex items-center space-x-2">
				<RadioGroup.Item value={option.value} id={`${field.name}-${option.id}`} />
				<Label for={`${field.name}-${option.id}`} class="cursor-pointer font-normal">
					{option.label}
				</Label>
			</div>
		{/each}
	{/if}
</RadioGroup.Root>
