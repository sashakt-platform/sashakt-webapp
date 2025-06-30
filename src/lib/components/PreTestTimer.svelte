<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	const startTime = new Date(page.data.testData.start_time);
	const startTimeString = startTime.toString().split(' GMT')[0];

	const { timeLeft: initialTime } = $props();
	let timeLeft = $state(6);

	const formatTime = (seconds: number) => {
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return [mins.toString().padStart(2, '0'), secs.toString().padStart(2, '0')].join(':');
	};

	$effect(() => {
		const intervalId = setInterval(() => {
			if (timeLeft > 0) {
				timeLeft--;
			}
		}, 1000);

		return () => clearInterval(intervalId);
	});
</script>

<Dialog.Content class="w-80 rounded-xl">
	{#if timeLeft <= 10 * 60}
		<Dialog.Header>
			<Dialog.Title class="text-center text-base/normal font-semibold"
				>Your test will begin shortly!</Dialog.Title
			>
			<Dialog.Description class="flex flex-col space-y-5 text-center text-xs/normal font-normal">
				<p>Time remaining for the test</p>

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
							stroke-dashoffset={402 - (timeLeft / (10 * 60)) * 402}
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
					The test has not commenced yet. Kindly ensure that you thoroughly review the provided
					instructions before beginning the test.
				</p>
			</Dialog.Description>
		</Dialog.Header>
	{:else}
		<Dialog.Header>
			<Dialog.Title class="text-center text-base/normal font-semibold"
				>Test has not started!</Dialog.Title
			>
			<Dialog.Description class="flex flex-col space-y-5 text-center text-sm/normal font-normal">
				<span>Test will start on</span>
				<div class="text-primary text-2xl font-semibold">{startTimeString}</div>

				<p>
					The test has not commenced yet. Kindly ensure that you thoroughly review the provided
					instructions before beginning the test.
				</p>
			</Dialog.Description>
		</Dialog.Header>
	{/if}

	<Dialog.Close>
		<form method="POST" action="?/createCandidate" use:enhance>
			<input name="deviceInfo" value={JSON.stringify(navigator.userAgent)} hidden />
			<Button type="submit" disabled={timeLeft > 10} class="mt-4 w-full">Okay, got it</Button>
		</form>
	</Dialog.Close>
</Dialog.Content>
