<script lang="ts">
	import type { TFormField } from '$lib/types';
	import { cn } from '$lib/utils';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: string) => void;
	}

	let { field, value, onchange }: Props = $props();
	let inputEl = $state<HTMLInputElement>();

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		onchange(target.value);
	}
</script>

<div class="relative flex items-center">
	<button
		type="button"
		onclick={() => inputEl?.showPicker()}
		class="absolute left-4 flex items-center"
	>
		<CalendarIcon class="text-muted-foreground size-4 shrink-0" />
	</button>
	<input
		type="date"
		id={field.name}
		name={field.name}
		bind:this={inputEl}
		value={value ?? field.default_value ?? ''}
		oninput={handleInput}
		required={field.is_required}
		class={cn(
			'border-input bg-card h-12 w-full rounded-xl border py-3 pl-10 pr-4 text-sm leading-[140%]',
			'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50',
			'[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
			value ? 'text-card-foreground font-normal' : 'text-muted-foreground font-light'
		)}
	/>
</div>
