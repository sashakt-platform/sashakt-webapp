<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseJsonRecord } from '$lib/helpers/matrixHelpers';
	import type { TCandidate, TMatrixOptions, TQuestion, TSelection } from '$lib/types';
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
	const matrixOpts = question.options as unknown as TMatrixOptions;

	let saveError = $state<string | null>(null);
	// Card mode only applies a selection to `selections` after a successful save,
	// so a failed submit never changes any reactive dependency the radios read —
	// nothing tells the browser to undo the native optimistic checked-on-click
	// state. Incrementing this on failure forces a remount to correct it (mirrors
	// the same fix already used for single-choice's RadioGroup).
	let matrixKey = $state(0);

	const currentSelection = $derived(
		selections.find((item) => item.question_revision_id === question.id)
	);
	// MATRIXRATING is never gradable/reviewable inline, but ViewFeedback reuses this
	// component in a permanently-locked, read-only posture via a synthetic selection.
	const isLocked = $derived(variant === 'card' && currentSelection?.is_reviewed === true);
	const isSectionLimitWarning = $derived(saveError?.includes(SECTION_LIMIT_ERROR_PREFIX) ?? false);

	const matrixResponse = $derived(parseJsonRecord<number>(currentSelection?.response));
	const getMatrixSelection = (rowId: number): number | undefined => matrixResponse[String(rowId)];

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

	const handleSelect = async (rowId: number, colId: number) => {
		if (isLocked || isSubmitting) return;

		const answeredQuestion = currentSelection;
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;
		const newResponse = JSON.stringify({ ...matrixResponse, [rowId]: colId });

		isSubmitting = true;
		saveError = null;

		const applyUpdate = () => {
			if (answeredQuestion) {
				selections = selections.map((q) =>
					q.question_revision_id === question.id ? { ...q, response: newResponse } : q
				);
			} else {
				selections = [
					...selections,
					{
						question_revision_id: question.id,
						response: newResponse,
						visited: true,
						time_spent: 0,
						bookmarked: currentBookmarked,
						is_reviewed: false
					}
				];
			}
			updateStore();
		};

		if (variant === 'card') {
			// Card mode applies the selection only after a successful save (matches
			// the original blocking behavior for this type).
			try {
				await submitAnswer(newResponse, currentBookmarked);
				applyUpdate();
			} catch (error) {
				matrixKey++;
				setTransientSaveError(error, 'Failed to save your answer. Please try again.');
			} finally {
				isSubmitting = false;
			}
		} else {
			// OMR mode applies optimistically and reverts on failure.
			const previousState = JSON.parse(JSON.stringify(selections));
			applyUpdate();

			try {
				await submitAnswer(newResponse, currentBookmarked);
			} catch (error) {
				selections = previousState;
				updateStore();
				setTransientSaveError(error, 'Failed to save your answer. Please try again.');
			} finally {
				isSubmitting = false;
			}
		}
	};

	// Only used by the omr variant, which embeds its own "Clear answer" button
	// per-question. Card variant defers to QuestionCard's shared button — this
	// type keeps no local buffer state, so the generic clear handler already
	// works correctly without any bridging.
	const clearAnswer = async () => {
		if (isSubmitting || !hasClearableAnswer) return;

		const answeredQuestion = currentSelection;
		if (!answeredQuestion) return;

		const currentBookmarked = answeredQuestion.bookmarked ?? false;
		const previousState = JSON.parse(JSON.stringify(selections));

		isSubmitting = true;
		saveError = null;

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
	{#key matrixKey}
		<div class="overflow-x-auto rounded-lg">
			<table class="border-border min-w-full border-collapse border text-sm">
				<thead>
					<tr class="border-border h-16 border-b">
						<th class="bg-muted text-muted-foreground min-w-55 px-5 text-left font-bold">
							{matrixOpts.rows.label}
						</th>
						{#each matrixOpts.columns.items as col (col.id)}
							<th class="bg-muted text-muted-foreground px-5 text-center font-bold">
								<span class="block">{col.value}</span>
								<span class="block">({col.key})</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each matrixOpts.rows.items as row (row.id)}
						<tr class="border-border hover:bg-accent border-b">
							<td class="min-w-55 px-4 py-3 font-medium wrap-break-word whitespace-normal">
								{row.value}
							</td>
							{#each matrixOpts.columns.items as col (col.id)}
								<td class="px-4 py-3 text-center">
									<input
										type="radio"
										name="matrix-{question.id}-row-{row.id}"
										value={col.id}
										checked={getMatrixSelection(row.id) === col.id}
										disabled={isLocked}
										class="accent-primary h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
										onchange={() => handleSelect(row.id, col.id)}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/key}
{:else}
	<div class="w-full space-y-3">
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs sm:text-sm">
				<thead>
					<tr>
						<th class="border border-border bg-muted px-3 py-2 text-left font-semibold">
							{matrixOpts.rows.label}
						</th>
						{#each matrixOpts.columns.items as col (col.id)}
							<th class="border border-border bg-muted px-3 py-2 text-center font-semibold">
								{col.key}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each matrixOpts.rows.items as row (row.id)}
						<tr class="hover:bg-muted/50">
							<td class="border border-border px-3 py-2 font-medium">{row.value}</td>
							{#each matrixOpts.columns.items as col (col.id)}
								<td class="border border-border px-3 py-2 text-center">
									<input
										type="radio"
										name="omr-matrix-{question.id}-row-{row.id}"
										value={col.id}
										checked={getMatrixSelection(row.id) === col.id}
										class="accent-primary h-4 w-4 cursor-pointer"
										aria-label="{row.value} – {col.key}"
										onchange={() => handleSelect(row.id, col.id)}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="flex justify-end">
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
