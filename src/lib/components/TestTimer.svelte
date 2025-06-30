<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Clock } from '@lucide/svelte';

	let { timeLeft: initialTime } = $props();
	let formElement = $state<HTMLFormElement>();
	let timeLeft = $state(initialTime);
	let open = $state(false);

	$effect(() => {
		const intervalId = setInterval(() => {
			if (timeLeft > 0) {
				timeLeft--;
				if (timeLeft === 10 * 60) open = true;
				if (timeLeft === 0) {
					open = true;
					setTimeout(() => {
						formElement?.requestSubmit();
					}, 5000);
				}
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
</script>

<div
	class={`inline-flex items-center gap-x-1 rounded-full ${lessTime() ? 'bg-red-700' : 'bg-green-700'} px-2 py-1.5 text-sm text-white`}
>
	<Clock size={18} />
	{formatTime(timeLeft)}

	<Dialog.Root bind:open>
		{#if timeLeft <= 10 * 60 && timeLeft}
			<Dialog.Content class="w-80 rounded-xl">
				<Dialog.Title>10 mins left!</Dialog.Title>
				<Dialog.Description>
					Please note that there is only 10 mins left for the test to complete, hurry up!
				</Dialog.Description>

				<Dialog.Close>
					<Button class="w-32 place-self-center">Okay</Button>
				</Dialog.Close>
			</Dialog.Content>
		{:else}
			<Dialog.Content class="w-80 rounded-xl">
				<Dialog.Title>Time Up!</Dialog.Title>
				<Dialog.Description>The test has ended and will be auto submitted.</Dialog.Description>

				<form action="?/submitTest" method="POST" use:enhance bind:this={formElement}>
					<Button type="submit" class="w-32">Submit</Button>
				</form>
			</Dialog.Content>
		{/if}
	</Dialog.Root>
</div>
