<script lang="ts">
	import type { TMedia } from '$lib/types';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';

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
	const isAudio = $derived(
		!isEmbeddable &&
			(hasExternal?.type === 'audio' ||
				/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(hasExternal?.url ?? ''))
	);

	let audioEl = $state<HTMLAudioElement | undefined>(undefined);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	const progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

	const formatTime = (secs: number) => {
		const m = Math.floor(secs / 60)
			.toString()
			.padStart(2, '0');
		const s = Math.floor(secs % 60)
			.toString()
			.padStart(2, '0');
		return `${m}:${s}`;
	};

	const togglePlay = () => {
		if (!audioEl) return;
		if (isPlaying) audioEl.pause();
		else audioEl.play();
	};

	const handleSeek = (e: Event) => {
		if (!audioEl || !duration) return;
		audioEl.currentTime = (Number((e.target as HTMLInputElement).value) / 100) * duration;
	};
</script>

{#if media && (hasImage || hasExternal)}
	<div class="mt-1 flex flex-col gap-2 lg:gap-2.5">
		{#if hasImage}
			<div class="max-w-sm lg:h-57.75 lg:w-122 lg:rounded-xl">
				<img
					src={media.image?.url}
					alt={media.image?.alt_text || 'Question image'}
					class="h-auto w-full rounded-lg object-contain lg:h-full"
					loading="lazy"
				/>
			</div>
		{/if}

		{#if hasExternal}
			{#if isAudio}
				<div
					class="bg-brand-light flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 lg:max-w-122"
				>
					<audio
						bind:this={audioEl}
						src={hasExternal.url}
						onplay={() => (isPlaying = true)}
						onpause={() => (isPlaying = false)}
						ontimeupdate={() => (currentTime = audioEl?.currentTime ?? 0)}
						onloadedmetadata={() => (duration = audioEl?.duration ?? 0)}
						onended={() => {
							isPlaying = false;
							currentTime = 0;
						}}
					></audio>
					<button
						type="button"
						onclick={togglePlay}
						class="bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
						aria-label={isPlaying ? 'Pause' : 'Play'}
					>
						{#if isPlaying}
							<Pause size={16} fill="currentColor" />
						{:else}
							<Play size={16} fill="currentColor" class="ml-0.5" />
						{/if}
					</button>
					<input
						type="range"
						min="0"
						max="100"
						value={progress}
						oninput={handleSeek}
						class="h-1.5 flex-1 cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:appearance-none"
						style="background: linear-gradient(to right, hsl(var(--primary)) {progress}%, hsl(var(--primary-foreground) / 0.5) {progress}%)"
						aria-label="Seek audio"
					/>
					<span class="text-muted-foreground min-w-10 text-right text-xs tabular-nums">
						{formatTime(currentTime > 0 ? currentTime : duration)}
					</span>
				</div>
			{:else if isEmbeddable}
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
