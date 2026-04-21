<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createFormEnhanceHandler } from '$lib/helpers/formErrorHandler';
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

	const HEARTBEAT_INTERVAL_MS = 15000;

	let formElement = $state<HTMLFormElement>();
	let timeLeft = $state(initialTime);
	let open = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
	let submitTimeout: ReturnType<typeof setTimeout> | null = null;
	let hasTriggeredAutoSubmit = $state(false);
	let nextSyncRequestId = 0;
	let latestAppliedSyncRequestId = 0;

	const clearCountdownInterval = () => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	};

	const clearHeartbeatInterval = () => {
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = null;
		}
	};

	const clearSubmitTimeout = () => {
		if (submitTimeout) {
			clearTimeout(submitTimeout);
			submitTimeout = null;
		}
	};

	const triggerAutoSubmit = () => {
		if (hasTriggeredAutoSubmit) return;
		hasTriggeredAutoSubmit = true;
		clearSubmitTimeout();
		submitTimeout = setTimeout(() => {
			formElement?.requestSubmit();
		}, 5000);
	};

	const handleTimeUp = () => {
		timeLeft = 0;
		open = true;
		clearCountdownInterval();
		clearHeartbeatInterval();
		triggerAutoSubmit();
	};

	const updateTimeLeft = (nextTimeLeft: number) => {
		timeLeft = Math.max(nextTimeLeft, 0);
		if (timeLeft === 10 * 60) open = true;
		if (timeLeft === 0) handleTimeUp();
	};

	const startCountdown = () => {
		if (countdownInterval || timeLeft <= 0) return;

		countdownInterval = setInterval(() => {
			if (timeLeft === 10 * 60) open = true;
			if (timeLeft <= 1) {
				handleTimeUp();
			} else {
				timeLeft--;
			}
		}, 1000);
	};

	const syncTimer = async (event: 'resume' | 'heartbeat') => {
		if (!pauseTimerWhenInactive || !candidate) return;

		const requestId = ++nextSyncRequestId;

		try {
			const response = await fetch(`/test/${page.params.slug}/api/timer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ candidate, event })
			});

			if (!response.ok) return;

			const data = await response.json();
			if (typeof data.time_left !== 'number') return;
			if (requestId < latestAppliedSyncRequestId) return;

			latestAppliedSyncRequestId = requestId;
			updateTimeLeft(Math.min(timeLeft, data.time_left));
		} catch {}
	};

	const startHeartbeat = () => {
		if (!pauseTimerWhenInactive || !candidate || heartbeatInterval) return;

		heartbeatInterval = setInterval(() => {
			void syncTimer('heartbeat');
		}, HEARTBEAT_INTERVAL_MS);
	};

	const resumeTimer = () => {
		startCountdown();
		startHeartbeat();
		void syncTimer('resume');
	};

	onMount(() => {
		if (!pauseTimerWhenInactive) {
			startCountdown();
			return () => {
				clearHeartbeatInterval();
				clearCountdownInterval();
				clearSubmitTimeout();
			};
		}

		resumeTimer();

		return () => {
			clearCountdownInterval();
			clearHeartbeatInterval();
			clearSubmitTimeout();
		};
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
