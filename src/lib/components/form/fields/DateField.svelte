<script lang="ts">
	import type { TFormField } from '$lib/types';
	import { cn } from '$lib/utils';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: string) => void;
	}

	let { field, value, onchange }: Props = $props();

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onchange(target.value);
	}
</script>

<input
	type="date"
	id={field.name}
	name={field.name}
	value={value ?? field.default_value ?? ''}
	oninput={handleInput}
	required={field.is_required}
	class={cn(
		'border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm',
		'ring-offset-background placeholder:text-muted-foreground',
		'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50'
	)}
/>
