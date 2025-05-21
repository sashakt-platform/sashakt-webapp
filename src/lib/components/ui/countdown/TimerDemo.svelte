<script lang="ts">
	import { TimerHeader } from './index.js';
	import { Button } from '../button/index.js';

	let testDuration = $state(60); // Default duration in minutes
	let isTestStarted = $state(false);

	function startTest() {
		isTestStarted = true;
	}

	function handleTimeout() {
		alert('Time is up! Your test would be submitted automatically.');
		isTestStarted = false;
	}
</script>

{#if isTestStarted}
	<TimerHeader timeLimit={testDuration} onTimeout={handleTimeout} />
{/if}

<div class="container">
	<h1>Timer Demo</h1>

	{#if !isTestStarted}
		<div class="test-config">
			<h2>Configure Test</h2>
			<div class="duration-input">
				<label for="test-duration">Test Duration (minutes):</label>
				<input id="test-duration" type="number" min="1" bind:value={testDuration} />
			</div>

			<Button onclick={startTest}>Start Test</Button>
		</div>
	{:else}
		<div class="test-content">
			<h2>Test in Progress</h2>
			<p>This is where your test content would go...</p>

			<!-- For demo purposes only -->
			<div class="demo-info">
				<h3>How it works:</h3>
				<ul>
					<li>The timer is shown in the header at the top</li>
					<li>It displays time in HH:MM:SS format</li>
					<li>When time runs out, the onTimeout callback is called</li>
					<li>For development purposes, you can control the timer in dev mode</li>
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 1rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
	}

	.test-config {
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.duration-input {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.duration-input input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
	}

	.test-content {
		border: 1px solid #ddd;
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.demo-info {
		margin-top: 2rem;
		background-color: #f8f9fa;
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.demo-info ul {
		margin-left: 1.5rem;
	}
</style>
