<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { t } from 'svelte-i18n';

	interface EntityOption {
		label: string;
		value: number;
	}

	let { testDetails } = $props();

	const hasProfile = $derived(testDetails.candidate_profile);
	const hasOmrChoice = $derived(testDetails.omr === 'OPTIONAL');

	let selectedEntity = $state(0);

	let selectedOmr = $state(
		testDetails.omr === 'OPTIONAL' ? '' : testDetails.omr === 'ALWAYS' ? 'true' : 'false'
	);
	let isSubmitting = $state(false);
	let createError = $state<string | null>(null);

	const entityOptions: EntityOption[] = $derived(
		testDetails.candidate_profile
			? testDetails.profile_list.map((entity: { id: number; label: string }) => ({
					value: String(entity.id),
					label: entity.label
				}))
			: []
	);

	const entityTriggerContent = $derived(
		entityOptions.find((g) => g.value === selectedEntity)?.label ?? `${$t('Select your CLF')}`
	);

	const omrTriggerContent = $derived(
		selectedOmr === 'true'
			? $t('Yes')
			: selectedOmr === 'false'
				? $t('No')
				: $t('Select OMR mode')
	);

	let isFormValid = $derived(
		(!hasProfile || selectedEntity > 0) && (!hasOmrChoice || selectedOmr !== '')
	);

	const handleCreateCandidateEnhance = createFormEnhanceHandler({
		setLoading: (loading) => (isSubmitting = loading),
		setError: (error) => (createError = error)
	});
</script>

<section class="mx-auto max-w-xl p-6">
	<h1 class="mb-4 text-xl font-semibold">{testDetails.name}</h1>
	<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">
		{hasProfile ? $t('Candidate Information') : $t('OMR Sheet Preference')}
	</h2>

	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title class="text-lg">
				{hasProfile ? $t('Please provide your details') : $t('Please select your preference')}
			</Card.Title>
			<Card.Description></Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/createCandidate"
				use:enhance={handleCreateCandidateEnhance}
				class="space-y-4"
			>
				{#if hasProfile}
					<div class="space-y-2">
						<Label for="entity">{$t('CLF')} *</Label>
						<Select.Root
							type="single"
							name="entity"
							bind:value={selectedEntity}
							disabled={isSubmitting}
						>
							<Select.Trigger class="w-full">
								{entityTriggerContent}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each entityOptions as option (option.value)}
										<Select.Item value={option.value} label={option.label}>
											{option.label}
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}

				{#if hasOmrChoice}
					<div class="space-y-2">
						<Label for="omrMode">{$t('OMR Mode')} *</Label>
						<Select.Root
							type="single"
							name="omrMode"
							bind:value={selectedOmr}
							disabled={isSubmitting}
						>
							<Select.Trigger class="w-full">
								{omrTriggerContent}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.Item value="true" label={$t('Yes')}>
										{$t('Yes')}
									</Select.Item>
									<Select.Item value="false" label={$t('No')}>
										{$t('No')}
									</Select.Item>
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
				{:else}
					<input name="omrMode" value={testDetails.omr === 'ALWAYS' ? 'true' : 'false'} hidden />
				{/if}

				{#if createError}
					<p class="text-destructive text-sm">{createError}</p>
				{/if}

				<input name="deviceInfo" value={JSON.stringify(navigator?.userAgent || '')} hidden />

				<div class="pt-4">
					<Button type="submit" class="w-full" disabled={!isFormValid || isSubmitting}>
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
