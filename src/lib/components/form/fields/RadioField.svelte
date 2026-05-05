<script lang="ts">
	import type { TFormField } from '$lib/types';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';

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
	class="flex flex-col gap-2"
>
	{#if field.options}
		{#each field.options as option, i (option.id)}
			{@const selected = selectedValue === option.value}
			{@const letter = String.fromCharCode(65 + i)}
			<div class="flex items-center gap-3">
				<span class="text-muted-foreground w-5 shrink-0 text-sm">{letter}</span>
				<div
					class={cn(
						'flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
						selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
					)}
				>
					<RadioGroup.Item value={option.value} id={`${field.name}-${option.id}`} />
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
</RadioGroup.Root>
