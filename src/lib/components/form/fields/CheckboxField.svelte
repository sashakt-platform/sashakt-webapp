<script lang="ts">
	import type { TFormField } from '$lib/types';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: boolean) => void;
	}

	let { field, value, onchange }: Props = $props();

	let checked = $state<boolean>(
		value !== undefined ? Boolean(value) : field.default_value === 'true'
	);

	$effect(() => {
		if (value !== undefined) {
			checked = Boolean(value);
		}
	});
</script>

<div class="flex items-center space-x-2">
	<Checkbox
		id={field.name}
		name={field.name}
		bind:checked
		onCheckedChange={(v) => {
			if (typeof v === 'boolean') {
				onchange(v);
			}
		}}
	/>
</div>
