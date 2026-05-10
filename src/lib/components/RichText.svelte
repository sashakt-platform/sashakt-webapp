<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';

	type MathJaxApi = {
		startup?: {
			promise?: Promise<void>;
		};
		typesetClear?: (elements?: HTMLElement[]) => void;
		typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
	};

	let {
		content = '',
		as = 'div',
		class: className = ''
	}: {
		content?: string | null;
		as?: 'div' | 'span';
		class?: string;
	} = $props();

	let element = $state<HTMLElement | null>(null);

	const typesetMath = async () => {
		if (!browser || !element) return;

		const mathJax = (window as Window & { MathJax?: MathJaxApi }).MathJax;
		if (!mathJax?.typesetPromise) return;

		await tick();

		try {
			if (mathJax.startup?.promise) {
				await mathJax.startup.promise;
			}
			mathJax.typesetClear?.([element]);
			await mathJax.typesetPromise([element]);
		} catch {
			// Keep backend text visible even if MathJax fails.
		}
	};

	onMount(() => {
		void typesetMath();
	});

	$effect(() => {
		content;
		void typesetMath();
	});
</script>

<svelte:element this={as} bind:this={element} class={`rich-text ${className}`.trim()}>
	{@html content ?? ''}
</svelte:element>
