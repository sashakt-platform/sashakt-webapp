<script lang="ts">
	import type { TMedia } from '$lib/types';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let {
		media
	}: {
		media: TMedia | null | undefined;
	} = $props();

	const hasImage = $derived(media?.image?.url);
	const hasExternal = $derived(media?.external_media);
	const isEmbeddable = $derived(
		hasExternal?.embed_url &&
			(hasExternal.provider === 'youtube' ||
				hasExternal.provider === 'vimeo' ||
				hasExternal.provider === 'spotify')
	);
</script>

{#if media && (hasImage || hasExternal)}
	<div class="mt-1 flex flex-col gap-2">
		{#if hasImage}
			<div class="max-w-sm">
				<img
					src={media.image?.url}
					alt={media.image?.alt_text || 'Question image'}
					class="h-auto w-full rounded-lg object-contain"
					loading="lazy"
				/>
			</div>
		{/if}

		{#if hasExternal}
			{#if isEmbeddable}
				<div
					class="max-w-sm"
					style={hasExternal.provider === 'spotify' ? 'height: 152px;' : 'aspect-ratio: 16/9;'}
				>
					<iframe
						src={hasExternal.embed_url}
						title={hasExternal.provider}
						class="h-full w-full rounded-lg"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen
						sandbox="allow-scripts allow-same-origin allow-presentation"
					></iframe>
				</div>
			{:else}
				<a
					href={hasExternal.url}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
				>
					<ExternalLink size={14} />
					{hasExternal.provider !== 'generic' ? hasExternal.provider : 'External media'}
				</a>
			{/if}
		{/if}
	</div>
{/if}
