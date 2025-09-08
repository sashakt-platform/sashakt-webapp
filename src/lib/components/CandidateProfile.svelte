<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';

	let { testDetails } = $props();

	let selectedEntity = $state('');

	const entityOptions = [
		{ value: 'Ujjala Mahila Mahasangh', label: 'Ujjala Mahila Mahasangh' },
		{ value: 'Prerana Mahila Cluster Sangthan', label: 'Prerana Mahila Cluster Sangthan' },
		{ value: 'Nari Shakti', label: 'Nari Shakti' },
		{ value: 'Anmol Mahila Block Federation', label: 'Anmol Mahila Block Federation' }
	];

	const triggerContent = $derived(
		entityOptions.find((g) => g.value === selectedEntity)?.label ?? 'Select your CLF'
	);

	let isFormValid = $derived(selectedEntity.trim().length > 0);
</script>

<section class="mx-auto max-w-xl p-6">
	<h1 class="mb-4 text-xl font-semibold">{testDetails.name}</h1>
	<h2 class="text-muted-foreground mb-4 text-xs font-bold uppercase">Candidate Information</h2>

	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title class="text-lg">Please provide your details</Card.Title>
			<Card.Description></Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/createCandidate" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="entity">CLF *</Label>
					<Select.Root type="single" name="entity" bind:value={selectedEntity}>
						<Select.Trigger class="w-full">
							{triggerContent}
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

				<input name="deviceInfo" value={JSON.stringify(navigator?.userAgent || '')} hidden />

				<div class="pt-4">
					<Button type="submit" class="w-full" disabled={!isFormValid}>Continue to Test</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</section>
