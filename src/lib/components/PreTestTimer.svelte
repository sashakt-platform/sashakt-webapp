<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t } from 'svelte-i18n';

	let formElement = $state<HTMLFormElement>();
	const startTime = new Date(page.data.testData.start_time);
	const formattedDate = startTime.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
	const formattedTime = startTime.toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});

	let { timeLeft: initialTime, showProfileForm = $bindable() } = $props();
	let timeLeft = $state(initialTime);

	const formatTime = (seconds: number) => {
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return [mins.toString().padStart(2, '0'), secs.toString().padStart(2, '0')].join(':');
	};

	$effect(() => {
		const intervalId = setInterval(() => {
			if (timeLeft > 0) {
				timeLeft--;
			} else if (timeLeft === 0) {
				if (
					showProfileForm !== undefined &&
					(page.data.testData.omr === 'OPTIONAL' || page.data.testData.form)
				) {
					showProfileForm = true;
				} else {
					formElement?.requestSubmit();
				}
			}
		}, 1000);

		return () => clearInterval(intervalId);
	});
</script>

{#if timeLeft >= 10 * 60}
	<Dialog.Content class="gap-0 overflow-hidden p-0 sm:max-w-100">
		<div class="bg-card border-border border-b p-8">
			<Dialog.Title class="text-xl font-bold">{$t('Test has not started yet')}</Dialog.Title>
		</div>

		<div class="bg-card flex flex-col gap-6 p-8">
			<Dialog.Description class="text-muted-foreground text-sm">
				{$t('The test will begin on {date} at {time}.', {
					values: { date: formattedDate, time: formattedTime }
				})}
			</Dialog.Description>

			<Dialog.Close>
				<Button class="w-full">{$t('Got it')}</Button>
			</Dialog.Close>
		</div>
	</Dialog.Content>
{:else}
	<Dialog.Content class="w-80 rounded-xl">
		<Dialog.Header>
			<Dialog.Title class="text-center text-base/normal font-semibold"
				>{$t('Your test will begin shortly!')}</Dialog.Title
			>
			<Dialog.Description class="flex flex-col space-y-5 text-center text-xs/normal font-normal">
				<p>{$t('Time remaining for the test')}</p>

				<div class="relative mx-auto flex items-center justify-center">
					<!-- Circular progress -->
					<svg class="h-36 w-36 -rotate-90 transform" viewBox="0 0 144 144">
						<circle cx="72" cy="72" r="73" fill="none" />
						<circle
							cx="72"
							cy="72"
							r="64"
							fill="none"
							stroke="currentColor"
							stroke-width="4"
							stroke-dasharray="402"
							stroke-dashoffset={(timeLeft / (10 * 60)) * 402 - 402}
							stroke-linecap="round"
							class="text-primary transition-all duration-1000"
						/>
					</svg>

					<!-- Timer text -->
					<div class="absolute flex items-center justify-center">
						<span class="text-primary text-3xl font-bold">
							{formatTime(timeLeft)}
						</span>
					</div>
				</div>

				<p>
					{$t(
						'The test has not commenced yet. Kindly ensure that you thoroughly review the provided instructions before beginning the test.'
					)}
				</p>
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Close>
			<form method="POST" action="?/createCandidate" use:enhance bind:this={formElement}>
				<input name="deviceInfo" value={JSON.stringify(navigator.userAgent)} hidden />
				{#if timeLeft <= 10}
					{#if showProfileForm !== undefined && (page.data.testData.omr === 'OPTIONAL' || page.data.testData.form)}
						<Button type="button" class="mt-4 w-full" onclick={() => (showProfileForm = true)}>
							{$t('Start Test')}
						</Button>
					{:else}
						<Button type="submit" class="mt-4 w-full">{$t('Start Test')}</Button>
					{/if}
				{:else}
					<Button class="mt-4 w-full">{$t('Got it')}</Button>
				{/if}
			</form>
		</Dialog.Close>
	</Dialog.Content>
{/if}
