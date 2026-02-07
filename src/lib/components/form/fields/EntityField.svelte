<script lang="ts">
	import type { TFormField } from '$lib/types';
	import * as Select from '$lib/components/ui/select';
	import { t } from 'svelte-i18n';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: number) => void;
		entities: Array<{ id: number; label: string }>;
	}

	let { field, value, onchange, entities }: Props = $props();

	// Use string for Select component, convert to/from number for external API
	let selectedValue = $state<string>(value !== undefined && value !== null ? String(value) : '');

	const triggerContent = $derived(
		entities.find((e) => String(e.id) === selectedValue)?.label ??
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
			{#each entities as entity (entity.id)}
				<Select.Item value={String(entity.id)} label={entity.label}>
					{entity.label}
				</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
