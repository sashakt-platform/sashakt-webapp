<script lang="ts">
	import { Countdown } from './index.js';

	let { remainingTimeInSeconds = $bindable(60), onTimeout = $bindable(() => {}) } = $props();
</script>

<div class="timer-header">
	<div class="container">
		<div class="timer-content">
			<div class="timer-box">
				<Countdown remainingTimeInSeconds={remainingTimeInSeconds} {onTimeout} />
			</div>
		</div>
	</div>
</div>

<style>
	.timer-header {
		position: sticky;
		top: 0;
		left: 0;
		width: 100%;
		background-color: #f8f9fa;
		border-bottom: 1px solid #e9ecef;
		z-index: 50;
		padding: 0.5rem 0;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.timer-content {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.timer-box {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background-color: #e74c3c;
		color: white;
		border-radius: 8px;
		padding: 8px 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
</style>
