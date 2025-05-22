<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<nav class="mb-1 bg-gray-50 p-3">
	<img src="/Frame.svg" alt="sashakt" class="w-40" />
</nav>

{@render children()}
