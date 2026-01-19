<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
	import { Clock } from '@lucide/svelte';
	import { t } from 'svelte-i18n';

	let { timeLeft: initialTime } = $props();
	let formElement = $state<HTMLFormElement>();
	let timeLeft = $state(initialTime);
	let open = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	$effect(() => {
		const intervalId = setInterval(() => {
			if (timeLeft === 10 * 60) open = true;
			if (timeLeft === 0) {
				open = true;
				clearInterval(intervalId);
				setTimeout(() => {
					formElement?.requestSubmit();
				}, 5000);
			} else {
				timeLeft--;
			}
		}, 1000);

		return () => clearInterval(intervalId);
	});

	const lessTime = () => {
		return timeLeft <= 10 * 60;
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
		setLoading: (loading) => (isSubmitting = loading),
		setError: (error) => (submitError = error),
		setDialogOpen: (openState) => (open = openState)
	});
</script>

<div
	class={`inline-flex items-center gap-x-1 rounded-full ${lessTime() ? 'bg-red-700' : 'bg-green-700'} px-2 py-1.5 text-sm text-white`}
>
	<Clock size={18} />
	{formatTime(timeLeft)}

	<Dialog.Root bind:open>
		{#if timeLeft <= 10 * 60 && timeLeft}
			<Dialog.Content class="w-80 rounded-xl">
				<Dialog.Title>{$t('10 mins left!')}</Dialog.Title>
				<Dialog.Description>
					{$t('Please note that there is only 10 mins left for the test to complete, hurry up!')}
				</Dialog.Description>

				<Dialog.Close>
					<Button class="w-32 place-self-center">{$t('Okay')}</Button>
				</Dialog.Close>
			</Dialog.Content>
		{:else}
			<Dialog.Content
				class="w-80 rounded-xl text-center [&>button]:hidden"
				interactOutsideBehavior="ignore"
				escapeKeydownBehavior="ignore"
			>
				<Dialog.Title>
					{#if submitError}
						{$t('Submission Failed')}
					{:else}
						{$t('Time Up!')}
					{/if}
				</Dialog.Title>
				<Dialog.Description>
					{#if submitError}
						<div class="text-destructive">
							<p class="mb-2">{submitError}</p>
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
					bind:this={formElement}
				>
					{#if timeLeft > 0 || submitError}
						<Button type="submit" class="w-32" disabled={isSubmitting}>
							{#if isSubmitting}
								<Spinner />
							{/if}
							{$t('Submit')}
						</Button>
					{/if}
				</form>
			</Dialog.Content>
		{/if}
	</Dialog.Root>
</div>
