<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Spinner } from '$lib/components/ui/spinner';
	import { t } from 'svelte-i18n';
	import type { TForm, TFormResponses } from '$lib/types';
	import FormField from './FormField.svelte';
	import { validateForm, type ValidationErrors } from './validation';

	interface Props {
		form: TForm;
		testDetails: { id: number; name: string };
		locations?: {
			states?: Array<{ id: number; name: string }>;
		};
		omrMode?: string;
	}

	let { form, testDetails, locations = {}, omrMode = '' }: Props = $props();

	let formResponses = $state<TFormResponses>({});
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let validationErrors = $state<ValidationErrors>({});

	// Sort fields by order
	const sortedFields = $derived([...form.fields].sort((a, b) => a.order - b.order));

	// Locate location fields by field_type to get their actual name properties
	const stateField = $derived(form.fields.find((f) => f.field_type === 'state'));
	const districtField = $derived(form.fields.find((f) => f.field_type === 'district'));
	const hasStateField = $derived(!!stateField);
	const hasDistrictField = $derived(!!districtField);

	function handleFieldChange(fieldName: string, value: unknown) {
		formResponses[fieldName] = value;
		// Clear validation error for this field when it changes
		if (validationErrors[fieldName]) {
			const newErrors = { ...validationErrors };
			delete newErrors[fieldName];
			validationErrors = newErrors;
		}
	}

	function validateBeforeSubmit(): boolean {
		const errors = validateForm(sortedFields, formResponses);
		validationErrors = errors;
		return Object.keys(errors).length === 0;
	}

	// Custom enhance handler with validation
	function formEnhance({ cancel }: { cancel: () => void }) {
		// Validate before submitting
		if (!validateBeforeSubmit()) {
			cancel();
			return;
		}

		isSubmitting = true;
		submitError = null;

		return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
			if (result.type === 'failure') {
				const errorMsg =
					(result.data as Record<string, unknown>)?.error?.toString() ||
					'An error occurred. Please try again.';
				submitError = errorMsg;
				isSubmitting = false;
			} else if (result.type === 'error') {
				submitError = 'Something went wrong. Please check your connection and try again.';
				isSubmitting = false;
			} else {
				submitError = null;
				await update();
				isSubmitting = false;
			}
		};
	}
</script>

<section class="mx-auto max-w-xl p-6">
	<h1 class="mb-4 text-xl font-semibold">{testDetails.name}</h1>
	<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">
		{form.name}
	</h2>

	<Card.Root class="mb-8">
		<Card.Header>
			{#if form.description}
				<Card.Description>{form.description}</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/createCandidate" use:enhance={formEnhance} class="space-y-6">
				{#each sortedFields as field (field.id)}
					<FormField
						{field}
						value={formResponses[field.name]}
						error={validationErrors[field.name]}
						{locations}
						selectedState={stateField
							? (formResponses[stateField.name] as number | undefined)
							: undefined}
						selectedDistrict={districtField
							? (formResponses[districtField.name] as number | undefined)
							: undefined}
						{hasStateField}
						{hasDistrictField}
						testId={testDetails.id}
						onchange={(value) => handleFieldChange(field.name, value)}
					/>
				{/each}

				{#if submitError}
					<p class="text-destructive text-sm">{submitError}</p>
				{/if}

				<input name="deviceInfo" value={JSON.stringify(navigator?.userAgent || '')} hidden />
				<input name="formResponses" value={JSON.stringify(formResponses)} hidden />
				{#if omrMode}
					<input name="omrMode" value={omrMode} hidden />
				{/if}

				<div class="pt-4">
					<Button type="submit" class="w-full" disabled={isSubmitting}>
						{#if isSubmitting}
							<Spinner />
						{/if}
						{$t('Continue to Test')}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</section>
