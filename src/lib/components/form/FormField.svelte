<script lang="ts">
	import type { TFormField } from '$lib/types';
	import { Label } from '$lib/components/ui/label';
	import TextField from './fields/TextField.svelte';
	import TextareaField from './fields/TextareaField.svelte';
	import NumberField from './fields/NumberField.svelte';
	import DateField from './fields/DateField.svelte';
	import SelectField from './fields/SelectField.svelte';
	import RadioField from './fields/RadioField.svelte';
	import CheckboxField from './fields/CheckboxField.svelte';
	import MultiSelectField from './fields/MultiSelectField.svelte';
	import EntityField from './fields/EntityField.svelte';
	import LocationField from './fields/LocationField.svelte';

	interface Props {
		field: TFormField;
		value: unknown;
		error?: string;
		entities?: Array<{ id: number; label: string }>;
		locations?: {
			states?: Array<{ id: number; name: string }>;
			districts?: Array<{ id: number; name: string; state_id: number }>;
			blocks?: Array<{ id: number; name: string; district_id: number }>;
		};
		selectedState?: number;
		selectedDistrict?: number;
		onchange: (value: unknown) => void;
	}

	let {
		field,
		value,
		error,
		entities = [],
		locations = {},
		selectedState,
		selectedDistrict,
		onchange
	}: Props = $props();
</script>

<div class="space-y-2">
	<Label for={field.name}>
		{field.label}
		{#if field.is_required}
			<span class="text-destructive">*</span>
		{/if}
	</Label>

	{#if field.field_type === 'text' || field.field_type === 'full_name'}
		<TextField {field} {value} {onchange} />
	{:else if field.field_type === 'email'}
		<TextField {field} {value} {onchange} inputType="email" />
	{:else if field.field_type === 'phone'}
		<TextField {field} {value} {onchange} inputType="tel" />
	{:else if field.field_type === 'textarea'}
		<TextareaField {field} {value} {onchange} />
	{:else if field.field_type === 'number'}
		<NumberField {field} {value} {onchange} />
	{:else if field.field_type === 'date'}
		<DateField {field} {value} {onchange} />
	{:else if field.field_type === 'select'}
		<SelectField {field} {value} {onchange} />
	{:else if field.field_type === 'radio'}
		<RadioField {field} {value} {onchange} />
	{:else if field.field_type === 'checkbox'}
		<CheckboxField {field} {value} {onchange} />
	{:else if field.field_type === 'multi_select'}
		<MultiSelectField {field} {value} {onchange} />
	{:else if field.field_type === 'entity'}
		<EntityField {field} {value} {onchange} {entities} />
	{:else if field.field_type === 'state' || field.field_type === 'district' || field.field_type === 'block'}
		<LocationField {field} {value} {onchange} {locations} {selectedState} {selectedDistrict} />
	{/if}

	{#if field.help_text}
		<p class="text-muted-foreground text-xs">{field.help_text}</p>
	{/if}

	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}
</div>
