<script lang="ts">
	import { Combobox } from 'bits-ui';
	import type { TFormField } from '$lib/types';
	import { Spinner } from '$lib/components/ui/spinner';
	import { t } from 'svelte-i18n';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	interface Props {
		field: TFormField;
		value: unknown;
		onchange: (value: number) => void;
		testId: number;
	}

	let { field, value, onchange, testId }: Props = $props();

	let searchResults = $state<Array<{ id: number; name: string }>>([]);
	let isLoading = $state(false);
	let open = $state(false);
	let hasLoaded = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let abortController: AbortController | null = null;
	let selectedValue = $state<string>(value !== undefined && value !== null ? String(value) : '');
	let inputValue = $state('');
	let needsNameResolution = $state(value !== undefined && value !== null);

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

	// Sync external value changes
	$effect(() => {
		if (value !== undefined && value !== null) {
			selectedValue = String(value);
		} else {
			selectedValue = '';
			inputValue = '';
		}
	});

	// Resolve display name when results become available for a pre-populated value
	$effect(() => {
		if (needsNameResolution && searchResults.length > 0 && selectedValue) {
			const match = searchResults.find((r) => String(r.id) === selectedValue);
			if (match) {
				inputValue = match.name;
			}
			needsNameResolution = false;
		}
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		debouncedSearch(target.value);
	}
</script>

<Combobox.Root
	type="single"
	bind:value={selectedValue}
	bind:open
	{inputValue}
	onValueChange={(v) => {
		if (v !== undefined && v !== '') {
			onchange(Number(v));
			const match = searchResults.find((r) => String(r.id) === v);
			if (match) {
				inputValue = match.name;
			}
		}
	}}
>
	<div class="relative">
		<Combobox.Input
			placeholder={field.placeholder ?? $t('Type to search...')}
			class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-2 pr-8 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
			oninput={handleInput}
		/>
		<div class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
			{#if isLoading}
				<Spinner class="size-4" />
			{:else}
				<ChevronDownIcon class="size-4 opacity-50" />
			{/if}
		</div>
	</div>

	<Combobox.Portal>
		<Combobox.Content
			class="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative z-50 max-h-60 min-w-[8rem] overflow-y-auto rounded-md border p-1 shadow-md"
			sideOffset={4}
		>
			{#if isLoading && searchResults.length === 0}
				<div class="flex items-center justify-center p-4">
					<Spinner class="size-4" />
				</div>
			{:else if searchResults.length === 0}
				<div class="text-muted-foreground p-2 text-sm">
					{$t('No results found')}
				</div>
			{:else}
				{#each searchResults as result (result.id)}
					<Combobox.Item
						value={String(result.id)}
						label={result.name}
						class="data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
					>
						{#snippet children({ selected })}
							<span class="absolute right-2 flex size-3.5 items-center justify-center">
								{#if selected}
									<CheckIcon class="size-4" />
								{/if}
							</span>
							{result.name}
						{/snippet}
					</Combobox.Item>
				{/each}
			{/if}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>
