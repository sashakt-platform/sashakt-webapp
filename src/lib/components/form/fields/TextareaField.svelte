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
		const target = event.target as HTMLTextAreaElement;
		onchange(target.value);
	}
</script>

<textarea
	id={field.name}
	name={field.name}
	placeholder={field.placeholder ?? ''}
	oninput={handleInput}
	minlength={field.validation?.min_length ?? undefined}
	maxlength={field.validation?.max_length ?? undefined}
	required={field.is_required}
	rows={4}
	class={cn(
		'border-input bg-background flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm',
		'ring-offset-background placeholder:text-muted-foreground',
		'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
		'disabled:cursor-not-allowed disabled:opacity-50'
	)}>{String(value ?? field.default_value ?? '')}</textarea
>
