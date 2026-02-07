<script lang="ts">
	import type { TFormField } from '$lib/types';
	import * as Select from '$lib/components/ui/select';
	import { t } from 'svelte-i18n';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: string) => void;
	}

	let { field, value, onchange }: Props = $props();

	let selectedValue = $state<string>(String(value ?? field.default_value ?? ''));

	const triggerContent = $derived(
		field.options?.find((opt) => opt.value === selectedValue)?.label ??
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
		if (v !== undefined) {
			onchange(v);
		}
	}}
>
	<Select.Trigger class="w-full">
		{triggerContent}
	</Select.Trigger>
	<Select.Content>
		<Select.Group>
			{#if field.options}
				{#each field.options as option (option.id)}
					<Select.Item value={option.value} label={option.label}>
						{option.label}
					</Select.Item>
				{/each}
			{/if}
		</Select.Group>
	</Select.Content>
</Select.Root>
