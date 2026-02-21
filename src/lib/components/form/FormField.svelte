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
	import SearchableEntityField from './fields/SearchableEntityField.svelte';
	import LocationField from './fields/LocationField.svelte';
	import SearchableLocationField from './fields/SearchableLocationField.svelte';

	interface Props {
		field: TFormField;
		value: unknown;
		error?: string;
		locations?: {
			states?: Array<{ id: number; name: string }>;
		};
		selectedState?: number;
		selectedDistrict?: number;
		hasStateField?: boolean;
		hasDistrictField?: boolean;
		testId: number;
		onchange: (value: unknown) => void;
	}

	let {
		field,
		value,
		error,
		locations = {},
		selectedState,
		selectedDistrict,
		hasStateField = false,
		hasDistrictField = false,
		testId,
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
		<SearchableEntityField {field} {value} {onchange} {testId} />
	{:else if field.field_type === 'state'}
		<LocationField {field} {value} {onchange} {locations} />
	{:else if field.field_type === 'district'}
		<SearchableLocationField
			{field}
			{value}
			{onchange}
			parentId={hasStateField ? selectedState : undefined}
			parentFieldName={hasStateField ? 'state' : ''}
			{testId}
		/>
	{:else if field.field_type === 'block'}
		<SearchableLocationField
			{field}
			{value}
			{onchange}
			parentId={hasDistrictField ? selectedDistrict : undefined}
			parentFieldName={hasDistrictField ? 'district' : ''}
			{testId}
		/>
	{/if}

	{#if field.help_text}
		<p class="text-muted-foreground text-xs">{field.help_text}</p>
	{/if}

	{#if error}
		<p class="text-destructive text-sm">{error}</p>
	{/if}
</div>
