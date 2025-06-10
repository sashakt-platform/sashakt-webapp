<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<nav class="mb-1 bg-gray-50 p-3">
	<h2
		class="w-ful text-primary scroll-m-20 pb-4 text-3xl font-extrabold tracking-tighter uppercase"
	>
		Sashakt
	</h2>
</nav>

{@render children()}
