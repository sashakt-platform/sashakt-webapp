<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<nav class="mb-1 p-3 text-center">
	<h2
		class="text-primary w-full scroll-m-20 pb-4 text-3xl font-extrabold tracking-tighter uppercase"
	>
		Sashakt
	</h2>
</nav>

{@render children()}
