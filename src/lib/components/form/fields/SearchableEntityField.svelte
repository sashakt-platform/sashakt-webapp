<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { TFormField } from '$lib/types';
	import { Spinner } from '$lib/components/ui/spinner';
	import { t } from 'svelte-i18n';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { cn } from '$lib/utils.js';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: number) => void;
		testId: number;
	}

	let { field, value, onchange, testId }: Props = $props();

	type EntityResult = {
		id: number;
		name: string;
		state?: { name: string } | null;
		district?: { name: string } | null;
		block?: { name: string } | null;
	};

	let searchResults = $state<Array<EntityResult>>([]);

	function displayLabel(result: EntityResult): string {
		const location = result.block?.name ?? result.district?.name ?? result.state?.name;
		return location ? `${result.name} (${location})` : result.name;
	}

	let isLoading = $state(false);
	let open = $state(false);
	let hasLoaded = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let abortController: AbortController | null = null;
	let selectedValue = $state<string>(value !== undefined && value !== null ? String(value) : '');
	let inputValue = $state('');
	let needsNameResolution = $state(value !== undefined && value !== null);

	const selectedLabel = $derived.by(() => {
		if (!selectedValue) return '';
		const match = searchResults.find((r) => String(r.id) === selectedValue);
		return match ? displayLabel(match) : '';
	});

	async function search(query: string) {
		if (abortController) abortController.abort();
		abortController = new AbortController();

		isLoading = true;
		try {
			let url = `/api/entity?test_id=${testId}`;
			if (query) url += `&name=${encodeURIComponent(query)}`;
			if (field.entity_type_id) url += `&entity_type_id=${field.entity_type_id}`;

			const response = await fetch(url, {
				signal: abortController.signal
			});
			if (response.ok) {
				const data = await response.json();
				searchResults = data.items || [];
			} else {
				searchResults = [];
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			searchResults = [];
		} finally {
			isLoading = false;
		}
	}

	function debouncedSearch(query: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => search(query), 300);
	}

	// Load initial results when dropdown opens or when a pre-populated value needs name resolution
	$effect(() => {
		if ((open || needsNameResolution) && !hasLoaded) {
			hasLoaded = true;
			search('');
		}
	});

	// Reset search input when popover opens
	$effect(() => {
		if (open) {
			inputValue = '';
		}
	});

	// Sync external value changes
	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		} else {
			selectedValue = '';
		}
	});

	// Resolve display name when results become available for a pre-populated value
	$effect(() => {
		if (needsNameResolution && searchResults.length > 0 && selectedValue) {
			const match = searchResults.find((r) => String(r.id) === selectedValue);
			if (match) {
				// name will be shown via selectedLabel derived
			}
			needsNameResolution = false;
		}
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		debouncedSearch(target.value);
	}

	function handleSelect(resultId: number) {
		selectedValue = String(resultId);
		onchange(resultId);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class="w-full justify-between font-normal"
				role="combobox"
				aria-expanded={open}
			>
				<span class="truncate">
					{selectedLabel || field.placeholder || $t('Type to search...')}
				</span>
				{#if isLoading}
					<Spinner class="ml-2 size-4 shrink-0" />
				{:else}
					<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[--bits-popover-anchor-width] p-0" align="start">
		<Command.Root shouldFilter={false}>
			<Command.Input
				placeholder={field.placeholder ?? $t('Type to search...')}
				bind:value={inputValue}
				oninput={handleInput}
			/>
			<Command.List>
				{#if isLoading && searchResults.length === 0}
					<div class="flex items-center justify-center p-4">
						<Spinner class="size-4" />
					</div>
				{:else if searchResults.length === 0}
					<Command.Empty>{$t('No results found')}</Command.Empty>
				{:else}
					<Command.Group>
						{#each searchResults as result (result.id)}
							<Command.Item value={String(result.id)} onSelect={() => handleSelect(result.id)}>
								<CheckIcon
									class={cn(
										'mr-2 size-4',
										selectedValue !== String(result.id) && 'text-transparent'
									)}
								/>
								{displayLabel(result)}
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
