<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	let { candidateTestId, candidateUuid, open = $bindable() } = $props();
	let timeLeft = $state(0);
	let loading = $state(true);
	let intervalId: number | null = null;

	$effect(() => {
		if (candidateTestId && candidateUuid && open) {
			fetchPreTestTime();
		}
		
		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	const fetchPreTestTime = async () => {
		try {
			loading = true;
			const response = await fetch(`/api/pretest-timer/${candidateTestId}?candidate_uuid=${candidateUuid}`);
			if (response.ok) {
				const data = await response.json();
				timeLeft = data.time_left * 60; // Convert minutes to seconds
				loading = false;
				startCountdown();
			} else {
				// Test might have already started
				loading = false;
				timeLeft = 0;
			}
		} catch (error) {
			console.error('Error fetching pre-test time:', error);
			loading = false;
			timeLeft = 0;
		}
	};

	const startCountdown = () => {
		if (intervalId) clearInterval(intervalId);
		
		intervalId = setInterval(() => {
			if (timeLeft > 0) {
				timeLeft--;
			} else {
				if (intervalId) clearInterval(intervalId);
				// Auto-close when time is up
				setTimeout(() => {
					open = false;
				}, 1000);
			}
		}, 1000);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const handleOkay = () => {
		if (intervalId) clearInterval(intervalId);
		open = false;
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="w-96 rounded-xl p-8">
		<div class="flex flex-col items-center space-y-6">
			<Dialog.Title class="text-xl font-semibold text-center">
				Your test will begin shortly!
			</Dialog.Title>
			
			<Dialog.Description class="text-center text-gray-600">
				Time remaining for the test
			</Dialog.Description>

			{#if loading}
				<div class="w-32 h-32 flex items-center justify-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				</div>
			{:else}
				<div class="relative w-32 h-32 flex items-center justify-center">
					<!-- Circular progress -->
					<svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 144 144">
						<circle
							cx="72"
							cy="72"
							r="64"
							fill="none"
							stroke="#e5e7eb"
							stroke-width="8"
						/>
						<circle
							cx="72"
							cy="72"
							r="64"
							fill="none"
							stroke="#2563eb"
							stroke-width="8"
							stroke-dasharray="402"
							stroke-dashoffset={402 - (timeLeft / (10 * 60)) * 402}
							stroke-linecap="round"
							class="transition-all duration-1000"
						/>
					</svg>
					
					<!-- Timer text -->
					<div class="absolute inset-0 flex items-center justify-center">
						<span class="text-2xl font-bold text-blue-600">
							{formatTime(timeLeft)}
						</span>
					</div>
				</div>
			{/if}

			<Dialog.Description class="text-center text-sm text-gray-500 max-w-sm">
				The test has not commenced yet. Kindly ensure that you thoroughly review the provided instructions before beginning the test.
			</Dialog.Description>

			<Button 
				class="w-32 bg-blue-600 hover:bg-blue-700"
				onclick={handleOkay}
				disabled={loading}
			>
				Okay, got it
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root> 