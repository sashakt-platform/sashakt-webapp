<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { testTimerState } from '$lib/testTimerState.svelte';
	import type { TCandidate } from '$lib/types';
	import { Clock } from '@lucide/svelte';
	import { t } from 'svelte-i18n';
	import { onMount } from 'svelte';

	let {
		timeLeft: initialTime,
		candidate = null,
		pauseTimerWhenInactive = false
	}: {
		timeLeft: number;
		candidate?: TCandidate | null;
		pauseTimerWhenInactive?: boolean;
	} = $props();

	// TestTimer can be mounted more than once at a time (one instance per
	// responsive nav layout). Only the "owner" instance drives the countdown,
	// heartbeat sync, and dialog — everyone else just displays the shared
	// timeLeft, so there's never more than one "time left" popup.
	const instanceId = Symbol();

	onMount(() => {
		testTimerState.register(instanceId, initialTime, candidate, pauseTimerWhenInactive);
		return () => testTimerState.unregister(instanceId);
	});

	const isOwner = $derived(testTimerState.ownerId === instanceId);

	$effect(() => {
		if (!isOwner) return;
		testTimerState.startForOwner();
		return () => testTimerState.stopForOwner();
	});

	const lessTime = () => {
		return testTimerState.timeLeft <= 10 * 60;
	};

	const formatTime = (seconds: number) => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return [
			hrs.toString().padStart(2, '0'),
			mins.toString().padStart(2, '0'),
			secs.toString().padStart(2, '0')
		].join(':');
	};

	// enhance handler for auto-submit form action
	const handleSubmitTestEnhance = createFormEnhanceHandler({
		setLoading: (loading) => (testTimerState.isSubmitting = loading),
		setError: (error) => (testTimerState.submitError = error),
		setDialogOpen: (openState) => (testTimerState.open = openState)
	});
</script>

<div
	class={`inline-flex items-center gap-x-1 rounded-full ${lessTime() ? 'bg-error-subtle text-error' : 'bg-success-subtle text-success'} px-2 py-1.5 text-sm font-medium`}
>
	<Clock size={18} />
	{formatTime(testTimerState.timeLeft)}

	{#if isOwner}
		<Dialog.Root bind:open={testTimerState.open}>
			{#if testTimerState.timeLeft <= 10 * 60 && testTimerState.timeLeft}
				<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-100">
					<div class="bg-muted px-6 pt-6 pr-12 pb-4">
						<Dialog.Title class="text-base font-semibold">{$t('10 mins left!')}</Dialog.Title>
					</div>

					<div class="border-border border-t"></div>

					<div class="bg-card px-6 py-6">
						<Dialog.Description>
							<p class="text-muted-foreground text-sm">
								{$t('Please note that there is only 10 mins left for the test to complete, hurry up!')}
							</p>
						</Dialog.Description>
					</div>

					<div class="bg-card flex justify-end px-6 pb-6">
						<Dialog.Close><Button>{$t('Okay')}</Button></Dialog.Close>
					</div>
				</Dialog.Content>
			{:else}
				<Dialog.Content
					class="w-80 rounded-xl text-center [&>button]:hidden"
					interactOutsideBehavior="ignore"
					escapeKeydownBehavior="ignore"
				>
					<Dialog.Title>
						{#if testTimerState.submitError}
							{$t('Submission Failed')}
						{:else}
							{$t('Time Up!')}
						{/if}
					</Dialog.Title>
					<Dialog.Description>
						{#if testTimerState.submitError}
							<div class="text-destructive">
								<p class="mb-2">{testTimerState.submitError}</p>
								<p class="text-muted-foreground">{$t('Please click Submit again to retry.')}</p>
							</div>
						{:else}
							{$t('The test has ended.')}
						{/if}
					</Dialog.Description>

					<form
						action="?/submitTest"
						method="POST"
						use:enhance={handleSubmitTestEnhance}
						bind:this={testTimerState.formElement}
					>
						{#if testTimerState.timeLeft > 0 || testTimerState.submitError}
							<Button type="submit" class="w-32" disabled={testTimerState.isSubmitting}>
								{#if testTimerState.isSubmitting}
									<Spinner />
								{/if}
								{$t('Submit')}
							</Button>
						{/if}
					</form>
				</Dialog.Content>
			{/if}
		</Dialog.Root>
	{/if}
</div>
