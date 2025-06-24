<script lang="ts">
	import { Timer } from '@lucide/svelte';

	let timeLeft = $state(0);

	$effect(() => {
		const intervalId = setInterval(() => {
			if (timeLeft > 0) {
				timeLeft--;
			}
		}, 1000);

		return () => clearInterval(intervalId);
	});

	const lessTime = () => {
		return timeLeft <= 1800;
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
	<Timer size={18} />
	{formatTime(timeLeft)}
</div>
