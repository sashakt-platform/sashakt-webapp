<script lang="ts">
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseJsonRecord, normalizeMatrixInputValues } from '$lib/helpers/matrixHelpers';
	import type { TCandidate, TMatrixInputOptions, TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		question,
		candidate,
		selections = $bindable(),
		variant,
		isSubmitting = $bindable(false)
	}: {
		question: TQuestion;
		candidate: TCandidate;
		selections: TSelection[];
		variant: 'card' | 'omr';
		isSubmitting?: boolean;
	} = $props();

	const SECTION_LIMIT_ERROR_PREFIX = 'Maximum attempt limit reached for section';
	const sessionStore = createTestSessionStore(candidate);
	const matrixOpts = question.options as unknown as TMatrixInputOptions;
	const inputType = matrixOpts.columns.input_type;

	let saveError = $state<string | null>(null);
	let saveStatus: 'idle' | 'pending' | 'saving' | 'saved' = $state('idle');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	let flushFn: (() => void) | undefined;

	const currentSelection = $derived(
		selections.find((item) => item.question_revision_id === question.id)
	);
	// MATRIXINPUT is never gradable/reviewable inline, but ViewFeedback reuses this
	// component in a permanently-locked, read-only posture via a synthetic selection.
	const isLocked = $derived(variant === 'card' && currentSelection?.is_reviewed === true);
	const isSectionLimitWarning = $derived(saveError?.includes(SECTION_LIMIT_ERROR_PREFIX) ?? false);

	const getExistingMatrixInputValues = () => parseJsonRecord<string>(currentSelection?.response);
	let matrixInputValues = $state<Record<string, string>>(getExistingMatrixInputValues());

	// Lets the parent's shared "Clear answer" button (card variant) reset our
	// local input buffer + in-flight debounce atomically, the same way it did
	// when this state lived directly in QuestionCard.
	export function setValues(value: Record<string, string>) {
		matrixInputValues = value;
		clearTimeout(debounceTimer);
		debounceTimer = undefined;
		saveStatus = 'idle';
	}

	const hasAttemptedResponse = (response: string | number[] | undefined | null): boolean => {
		if (typeof response === 'string') return response.trim().length > 0;
		return (response?.length ?? 0) > 0;
	};
	const hasClearableAnswer = $derived(hasAttemptedResponse(currentSelection?.response));

	const getErrorMessage = (error: unknown, fallback: string) =>
		error instanceof Error && error.message ? error.message : fallback;

	const setTransientSaveError = (error: unknown, fallback: string) => {
		saveError = getErrorMessage(error, fallback);
		setTimeout(() => (saveError = null), 5000);
	};

	const updateStore = () => {
		sessionStore.current = { ...sessionStore.current, candidate, selections };
	};

	const submitAnswer = async (response: string, bookmarked?: boolean) => {
		const data = {
			question_revision_id: question.id,
			response: response.length > 0 ? response : null,
			candidate,
			bookmarked
		};

		const res = await fetch(`/test/${page.params.slug}/api/submit-answer`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (!res.ok) {
			const errorData = await res.json();
			throw new Error(errorData.error || 'Failed to submit answer');
		}

		return await res.json();
	};

	const handleMatrixInputSave = async () => {
		if (isLocked || isSubmitting) return;

		const answeredQuestion = currentSelection;
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;
		const normalized = normalizeMatrixInputValues(matrixInputValues);
		const serialized = Object.keys(normalized).length > 0 ? JSON.stringify(normalized) : '';
		const previousState = JSON.parse(JSON.stringify(selections));

		isSubmitting = true;
		saveStatus = 'saving';
		saveError = null;

		if (answeredQuestion) {
			selections = selections.map((q) =>
				q.question_revision_id === question.id ? { ...q, response: serialized } : q
			);
		} else {
			selections = [
				...selections,
				{
					question_revision_id: question.id,
					response: serialized,
					visited: true,
					time_spent: 0,
					bookmarked: currentBookmarked,
					is_reviewed: false
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(serialized, currentBookmarked);
			saveStatus = 'saved';
		} catch {
			// Save failures always show the generic fallback (unlike clear-answer
			// failures below), matching this type's original behavior.
			selections = previousState;
			updateStore();
			saveStatus = 'idle';
			saveError = $t('Failed to save your answer. Please try again.');
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};

	const scheduleSave = () => {
		saveStatus = 'pending';
		flushFn = handleMatrixInputSave;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => handleMatrixInputSave(), 800);
	};

	const handleMatrixInputChange = (rowId: number, value: string) => {
		if (isLocked || isSubmitting) return;
		matrixInputValues = { ...matrixInputValues, [String(rowId)]: value };
		scheduleSave();
	};

	$effect(() => {
		return () => {
			if (debounceTimer !== undefined && saveStatus === 'pending' && flushFn) {
				clearTimeout(debounceTimer);
				flushFn();
			}
		};
	});

	// Only used by the omr variant, which embeds its own "Clear answer" button
	// per-question (card variant defers to QuestionCard's shared button + setValues()).
	const clearAnswer = async () => {
		if (isSubmitting || !hasClearableAnswer) return;

		const answeredQuestion = currentSelection;
		if (!answeredQuestion) return;

		const currentBookmarked = answeredQuestion.bookmarked ?? false;
		const previousState = JSON.parse(JSON.stringify(selections));

		isSubmitting = true;
		saveError = null;
		setValues({});

		selections = selections.map((selection) =>
			selection.question_revision_id === question.id
				? {
						...selection,
						response: '',
						visited: true,
						bookmarked: currentBookmarked,
						is_reviewed: false,
						correct_answer: undefined
					}
				: selection
		);
		updateStore();

		try {
			await submitAnswer('', currentBookmarked);
		} catch (error) {
			selections = previousState;
			updateStore();
			const previousResponse = previousState.find(
				(selection: TSelection) => selection.question_revision_id === question.id
			)?.response;
			matrixInputValues =
				typeof previousResponse === 'string' ? parseJsonRecord<string>(previousResponse) : {};
			setTransientSaveError(error, 'Failed to clear your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};
</script>

{#if variant === 'card'}
	{#if saveError}
		<div
			class={`mb-4 rounded-lg border p-3 text-sm ${
				isSectionLimitWarning
					? 'border-warning bg-warning-subtle text-warning'
					: 'border-destructive bg-destructive/10 text-destructive'
			}`}
		>
			{saveError}
			{#if isSectionLimitWarning}
				<p class="text-warning mt-2 text-xs">
					{$t('Clear another answered question in this section to attempt this one.')}
				</p>
			{/if}
		</div>
	{/if}
	<div class="overflow-x-auto">
		<div class="border-border overflow-hidden rounded-xl border">
			<div class="px-4">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="border-border bg-muted border-b">
							<th class="text-foreground px-4 py-3 text-left font-semibold">
								{matrixOpts.rows.label}
							</th>
							<th class="text-foreground px-4 py-3 text-left font-semibold">
								{matrixOpts.columns.label}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each matrixOpts.rows.items as row (row.id)}
							<tr class="border-border hover:bg-accent border-b last:border-b-0">
								<td class="w-1/2 px-4 py-3 font-medium">
									<span class="font-semibold">{row.key}.</span>
									<span class="ml-1">{row.value}</span>
								</td>
								<td class="w-1/2 px-4 py-3">
									<input
										type={inputType}
										class="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
										placeholder={$t('Enter answer')}
										value={matrixInputValues[String(row.id)] ?? ''}
										disabled={isLocked}
										oninput={(e) =>
											handleMatrixInputChange(row.id, (e.target as HTMLInputElement).value)}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
	{#if saveStatus === 'saving'}
		<span class="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
			<Spinner class="size-3" />{$t('Saving...')}
		</span>
	{:else if saveStatus === 'saved'}
		<span class="text-success mt-3 flex items-center gap-1 text-xs">
			<Check class="size-3" />{$t('Saved')}
		</span>
	{/if}
{:else}
	<div class="flex w-full flex-col gap-2">
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs sm:text-sm">
				<thead>
					<tr>
						<th class="border border-border bg-muted px-3 py-2 text-left font-semibold">
							{matrixOpts.rows.label}
						</th>
						<th class="border border-border bg-muted px-3 py-2 text-left font-semibold">
							{matrixOpts.columns.label}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each matrixOpts.rows.items as row (row.id)}
						<tr class="hover:bg-muted/50">
							<td class="border border-border px-3 py-2 font-medium">
								<span class="font-semibold">{row.key}.</span>
							</td>
							<td class="border border-border px-3 py-2">
								<input
									type={inputType}
									class="border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									value={matrixInputValues[String(row.id)] ?? ''}
									disabled={isSubmitting}
									oninput={(e) =>
										handleMatrixInputChange(row.id, (e.target as HTMLInputElement).value)}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				{#if saveStatus === 'saving'}
					<span class="text-muted-foreground flex items-center gap-1 text-xs">
						<Spinner class="size-3" />{$t('Saving...')}
					</span>
				{:else if saveStatus === 'saved'}
					<span class="text-success flex items-center gap-1 text-xs">
						<Check class="size-3" />{$t('Saved')}
					</span>
				{/if}
			</div>
			<Button
				size="sm"
				variant="outline"
				onclick={clearAnswer}
				disabled={isSubmitting || !hasClearableAnswer}
			>
				{$t('Clear answer')}
			</Button>
		</div>
	</div>
{/if}
