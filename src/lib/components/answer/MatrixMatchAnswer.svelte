<script lang="ts">
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import { parseJsonRecord } from '$lib/helpers/matrixHelpers';
	import { getMatrixCellStatus, parseMatrixAnswer } from '$lib/helpers/feedbackHelpers';
	import {
		isSectionLimitError,
		createTransientSaveError,
		hasAttemptedResponse
	} from '$lib/helpers/answerErrorHelpers';
	import type { TCandidate, TMatrixOptions, TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';
	import { cn } from '$lib/utils';
	import QuestionMedia from '../QuestionMedia.svelte';
	import SaveErrorBanner from './SaveErrorBanner.svelte';

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

	const sessionStore = createTestSessionStore(candidate);
	const matrix = question.options as TMatrixOptions;

	let saveError = $state<string | null>(null);

	const currentSelection = $derived(
		selections.find((item) => item.question_revision_id === question.id)
	);
	// MATRIXMATCH is gradable, but only ever shown locked via QuestionCard's own
	// "View Feedback" flow (card variant) or ViewFeedback's synthetic selection.
	const isLocked = $derived(variant === 'card' && currentSelection?.is_reviewed === true);
	const isSectionLimitWarning = $derived(isSectionLimitError(saveError));
	const correctMatrix = $derived(
		isLocked ? parseMatrixAnswer(currentSelection?.correct_answer ?? null) : {}
	);

	const getExistingMatrixSelections = (): Record<string, number[]> => {
		const parsed = parseJsonRecord<number | number[]>(currentSelection?.response);
		return Object.fromEntries(
			Object.entries(parsed).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
		);
	};
	let matrixSelections = $state<Record<string, number[]>>(getExistingMatrixSelections());

	// Lets the parent's shared "Clear answer" button (card variant) reset our
	// local selection buffer, the same way it did when this state lived
	// directly in QuestionCard.
	export function setSelections(value: Record<string, number[]>) {
		matrixSelections = value;
	}

	const hasClearableAnswer = $derived(hasAttemptedResponse(currentSelection?.response));

	const setTransientSaveError = createTransientSaveError((value) => (saveError = value));

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

	const handleSelect = async (rowKey: string | number, colId: number) => {
		if (isLocked || isSubmitting) return;

		const answeredQuestion = currentSelection;
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		const key = String(rowKey);
		const current = matrixSelections[key] ?? [];
		const newSelections = {
			...matrixSelections,
			[key]: current.includes(colId) ? current.filter((id) => id !== colId) : [...current, colId]
		};
		const serialized = JSON.stringify(newSelections);
		const previousSelections = { ...matrixSelections };
		const previousState = JSON.parse(JSON.stringify(selections));

		isSubmitting = true;
		saveError = null;
		matrixSelections = newSelections;

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
		} catch (error) {
			matrixSelections = previousSelections;
			selections = previousState;
			updateStore();
			setTransientSaveError(error, 'Failed to save your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};

	// Only used by the omr variant, which embeds its own "Clear answer" button
	// per-question (card variant defers to QuestionCard's shared button + setSelections()).
	const clearAnswer = async () => {
		if (isSubmitting || !hasClearableAnswer) return;

		const answeredQuestion = currentSelection;
		if (!answeredQuestion) return;

		const currentBookmarked = answeredQuestion.bookmarked ?? false;
		const previousState = JSON.parse(JSON.stringify(selections));
		const previousMatrixSelections = { ...matrixSelections };

		isSubmitting = true;
		saveError = null;
		matrixSelections = {};

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
			matrixSelections = previousMatrixSelections;
			setTransientSaveError(error, 'Failed to clear your answer. Please try again.');
		} finally {
			isSubmitting = false;
		}
	};
</script>

{#if variant === 'card'}
	<SaveErrorBanner message={saveError} {isSectionLimitWarning} class="mb-4" />
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
		<div class="border-border overflow-hidden rounded-xl border">
			<div
				class="bg-muted text-foreground py-4 text-center text-xs font-bold tracking-widest uppercase"
			>
				{matrix.rows.label}
			</div>
			{#each matrix.rows.items as row (row.id)}
				<div class="border-border flex items-start gap-3 border-t px-4 py-3">
					<span class="text-foreground min-w-4 shrink-0 text-sm font-bold">{row.key}</span>
					<div class="text-foreground text-sm">
						{row.value}
						{#if row.media}
							<QuestionMedia media={row.media} />
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<div class="border-border overflow-hidden rounded-xl border">
			<div
				class="bg-muted text-foreground py-4 text-center text-xs font-bold tracking-widest uppercase"
			>
				{matrix.columns.label}
			</div>
			{#each matrix.columns.items as col (col.id)}
				<div class="border-border flex items-start gap-3 border-t px-4 py-3">
					<span class="text-foreground min-w-4 shrink-0 text-sm font-bold">{col.key}</span>
					<div class="text-foreground text-sm">
						{col.value}
						{#if col.media}
							<QuestionMedia media={col.media} />
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="mt-6 flex justify-center">
		<div class="w-full max-w-2xl">
			<div class="border-border overflow-hidden rounded-xl border">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="bg-muted">
							<th class="w-14 px-4 py-3"></th>
							{#each matrix.columns.items as col (col.id)}
								<th class="text-foreground min-w-16 px-4 py-3 text-center font-semibold">
									{col.key}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each matrix.rows.items as row (row.id)}
							<tr class="border-border border-b last:border-b-0">
								<td class="text-foreground px-4 py-3 text-center text-sm font-semibold"
									>{row.key}
								</td>
								{#each matrix.columns.items as col (col.id)}
									<td class="px-4 py-3 text-center">
										{#if isLocked}
											{@const status = getMatrixCellStatus(
												row.id,
												col.id,
												matrixSelections,
												correctMatrix
											)}
											<div
												class={cn(
													'mx-auto flex h-5 w-5 items-center justify-center rounded border-2',
													status === 'correct' && 'bg-success border-success',
													status === 'missed' && 'bg-card border-success',
													status === 'wrong' && 'bg-error border-error',
													status === 'none' && 'bg-card border-border'
												)}
											>
												{#if status === 'correct' || status === 'wrong'}
													<Check size={14} class="text-primary-foreground" />
												{/if}
											</div>
										{:else}
											{@const isChecked = (matrixSelections[row.id] ?? []).includes(col.id)}
											<Checkbox
												checked={isChecked}
												disabled={isLocked}
												onCheckedChange={() => handleSelect(row.id, col.id)}
												class="border-input data-[state=checked]:border-primary"
											/>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{:else}
	<div class="flex w-full flex-col gap-3">
		<div class="overflow-x-auto">
			<table class="border-collapse text-sm">
				<thead>
					<tr>
						<th class="w-10 px-3 py-2"></th>
						{#each matrix.columns.items as col (col.id)}
							<th class="px-5 py-2 text-center font-semibold text-foreground">{col.key}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each matrix.rows.items as row (row.id)}
						<tr>
							<td class="px-3 py-3 font-semibold text-foreground">{row.key}</td>
							{#each matrix.columns.items as col (col.id)}
								{@const isChecked = (matrixSelections[String(row.id)] ?? []).includes(col.id)}
								<td class="px-5 py-3 text-center">
									<Checkbox
										checked={isChecked}
										onCheckedChange={async () => {
											await handleSelect(String(row.id), col.id);
										}}
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
