<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { t } from 'svelte-i18n';

	let {
		testDetails,
		formResponses = {}
	}: { testDetails: any; formResponses?: Record<string, unknown> } = $props();

	const hasOmrChoice = $derived(testDetails.omr === 'OPTIONAL');

	let selectedOmr = $state('');
	let isSubmitting = $state(false);
	let createError = $state<string | null>(null);

	const omrTriggerContent = $derived(
		selectedOmr === 'true' ? $t('Yes') : selectedOmr === 'false' ? $t('No') : $t('Select OMR mode')
	);

	let isFormValid = $derived(!hasOmrChoice || selectedOmr !== '');

	const handleCreateCandidateEnhance = createFormEnhanceHandler({
		setLoading: (loading) => (isSubmitting = loading),
		setError: (error) => (createError = error)
	});
</script>

<section class="mx-auto max-w-xl p-6">
	<h1 class="mb-4 text-xl font-semibold">{testDetails.name}</h1>
	<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">
		{$t('OMR Sheet Preference')}
	</h2>

	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title class="text-lg">{$t('Please select your preference')}</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/createCandidate"
				use:enhance={handleCreateCandidateEnhance}
				class="space-y-4"
			>
				{#if hasOmrChoice}
					<div class="space-y-2">
						<Label for="omrMode">{$t('OMR Mode')} *</Label>
						<Select.Root type="single" name="omrMode" bind:value={selectedOmr} disabled={isSubmitting}>
							<Select.Trigger class="w-full">{omrTriggerContent}</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.Item value="true" label={$t('Yes')}>{$t('Yes')}</Select.Item>
									<Select.Item value="false" label={$t('No')}>{$t('No')}</Select.Item>
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}

				{#if createError}
					<p class="text-destructive text-sm">{createError}</p>
				{/if}

				<input name="deviceInfo" value={JSON.stringify(navigator?.userAgent || '')} hidden />
				{#if Object.keys(formResponses).length > 0}
					<input name="formResponses" value={JSON.stringify(formResponses)} hidden />
				{/if}

				<div class="pt-4">
					<Button type="submit" class="w-full" disabled={!isFormValid || isSubmitting}>
						{#if isSubmitting}<Spinner />{/if}
						{$t('Continue to Test')}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</section>
