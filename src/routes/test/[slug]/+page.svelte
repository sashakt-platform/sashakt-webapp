<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1>{data.name}</h1>
<div>{@html data.start_instructions}</div>
