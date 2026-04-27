<script lang="ts">
	import type { TFormField } from '$lib/types';
	import { cn } from '$lib/utils';
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

	function handleToggle(optionValue: string) {
		const currently = selectedValues.includes(optionValue);
		if (currently) {
			selectedValues = selectedValues.filter((v) => v !== optionValue);
		} else {
			selectedValues = [...selectedValues, optionValue];
		}
		onchange(selectedValues);
	}

	function isSelected(optionValue: string): boolean {
		return selectedValues.includes(optionValue);
	}
</script>

<div class="flex flex-col gap-2">
	{#if field.options}
		{#each field.options as option, i (option.id)}
			{@const selected = isSelected(option.value)}
			{@const letter = String.fromCharCode(65 + i)}
			<div class="flex items-center gap-3">
				<span class="text-muted-foreground w-5 shrink-0 text-sm">{letter}</span>
				<div
					class={cn(
						'flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
						selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
					)}
				>
					<Checkbox
						id={`${field.name}-${option.id}`}
						checked={isSelected(option.value)}
						onCheckedChange={() => handleToggle(option.value)}
					/>
					<Label
						for={`${field.name}-${option.id}`}
						class="text-foreground flex-1 cursor-pointer text-sm font-normal"
					>
						{option.label}
					</Label>
				</div>
			</div>
		{/each}
	{/if}
</div>
