<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import Check from '@lucide/svelte/icons/check';
	import { question_type_enum, type TMatrixOptions, type TOptions, type TQuestion } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		question,
		questionIndex,
		isSubmitting,
		radioGroupKey,
		selectedOptionIds,
		isSelected,
		onSelectOption,
		candidateInput = '',
		hasUnsavedChanges = false,
		hasSavedBefore = false,
		onSubjectiveSubmit,
		onCandidateInputChange,
		matrixSelections = {},
		matrixResponse = {},
		onMatrixInput
	}: {
		question: TQuestion;
		questionIndex: number;
		isSubmitting: boolean;
		radioGroupKey: number;
		selectedOptionIds: number[];
		isSelected: (optionId: number) => boolean;
		onSelectOption: (optionId: number, isRemoving?: boolean) => Promise<void>;
		candidateInput?: string;
		hasUnsavedChanges?: boolean;
		hasSavedBefore?: boolean;
		onSubjectiveSubmit?: () => Promise<void>;
		onCandidateInputChange?: (v: string) => void;
		matrixSelections?: Record<string, number[]>;
		matrixResponse?: Record<string, number>;
		onMatrixInput?: (rowKey: string | number, colId: number) => Promise<void>;
	} = $props();
</script>

<div
	class="flex items-center gap-6 sm:gap-10 {isSubmitting ? 'pointer-events-none' : ''}"
>
	<div class="flex items-center gap-1.5">
		<Spinner class={isSubmitting ? '' : 'invisible'} />
		<div class="flex min-w-12 items-center justify-end gap-0.5 sm:min-w-16">
			<span class="text-sm font-medium text-slate-700 sm:text-lg">Q.{questionIndex + 1}:</span>
			<span
				class="text-sm leading-none font-bold text-red-500 sm:text-lg {question.is_mandatory
					? ''
					: 'invisible'}">*</span
			>
		</div>
	</div>

	{#if question.question_type === question_type_enum.SUBJECTIVE}
		<div class="flex w-full flex-col gap-2">
			<textarea
				class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-30 w-full rounded-xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				placeholder={$t('Type your answer here...')}
				value={candidateInput}
				maxlength={question.subjective_answer_limit || undefined}
				oninput={(e) => onCandidateInputChange?.(e.currentTarget.value)}
			></textarea>
			<div class="flex items-center justify-between">
				<Button
					size="sm"
					onclick={onSubjectiveSubmit}
					disabled={isSubmitting || !String(candidateInput).trim() || !hasUnsavedChanges}
				>
					{#if !hasUnsavedChanges && hasSavedBefore}
						<Check class="mr-1 h-4 w-4" />{$t('Saved')}
					{:else if hasSavedBefore}
						{$t('Update Answer')}
					{:else}
						{$t('Save Answer')}
					{/if}
				</Button>
				{#if question.subjective_answer_limit}
					{@const remaining = question.subjective_answer_limit - candidateInput.length}
					<span
						class="text-sm {remaining <= 0
							? 'font-medium text-red-500'
							: 'text-muted-foreground'}"
					>
						{remaining}
						{$t('characters remaining')}
					</span>
				{/if}
			</div>
		</div>
	{:else if question.question_type === question_type_enum.MULTIPLE}
		{@const typedOptions = question.options as TOptions[]}
		<div class="grid grid-cols-4 gap-2 sm:gap-3">
			{#each typedOptions as option (option.id)}
				{@const uid = `omr-${question.id}-${option.key}`}
				<Label
					for={uid}
					class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm sm:px-5 sm:py-4 sm:text-base {isSelected(
						option.id
					)
						? 'bg-primary text-muted *:border-muted *:text-muted'
						: ''}"
				>
					{option.key}
					<Checkbox
						id={uid}
						value={option.id.toString()}
						class="ml-2 data-[state=checked]:bg-transparent data-[state=checked]:text-current sm:ml-3"
						checked={isSelected(option.id)}
						onCheckedChange={async (check) => {
							await onSelectOption(option.id, check === false);
						}}
					/>
				</Label>
			{/each}
		</div>
	{:else if question.question_type === question_type_enum.SINGLE}
		{@const typedOptions = question.options as TOptions[]}
		{#key radioGroupKey}
			<RadioGroup.Root
				class="grid grid-cols-4 gap-2 sm:gap-3"
				orientation="horizontal"
				onValueChange={async (optionId) => {
					await onSelectOption(Number(optionId));
				}}
				value={selectedOptionIds[0]?.toString()}
			>
				{#each typedOptions as option (option.id)}
					{@const uid = `omr-${question.id}-${option.key}`}
					<Label
						for={uid}
						class="flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm sm:px-5 sm:py-4 sm:text-base {isSelected(
							option.id
						)
							? 'bg-primary text-muted *:border-muted *:text-muted'
							: ''}"
					>
						{option.key}
						<RadioGroup.Item value={option.id.toString()} id={uid} class="ml-2 sm:ml-3" />
					</Label>
				{/each}
			</RadioGroup.Root>
		{/key}
	{:else if question.question_type === question_type_enum.NUMERICALINTEGER || question.question_type === question_type_enum.NUMERICALDECIMAL}
		<div class="flex w-full flex-col gap-2">
			<input
				type="number"
				step={question.question_type === question_type_enum.NUMERICALDECIMAL ? 'any' : '1'}
				class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-xl border px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				placeholder={$t('Type your answer here...')}
				value={candidateInput}
				oninput={(e) => onCandidateInputChange?.(e.currentTarget.value)}
			/>
			<div class="flex items-center justify-between">
				<Button
					size="sm"
					onclick={onSubjectiveSubmit}
					disabled={isSubmitting || !String(candidateInput).trim() || !hasUnsavedChanges}
				>
					{#if !hasUnsavedChanges && hasSavedBefore}
						<Check class="mr-1 h-4 w-4" />{$t('Saved')}
					{:else if hasSavedBefore}
						{$t('Update Answer')}
					{:else}
						{$t('Save Answer')}
					{/if}
				</Button>
			</div>
		</div>
	{:else if question.question_type === question_type_enum.MATRIXMATCH}
		{@const matrix = question.options as TMatrixOptions}
		{@const matrixRows = matrix.rows.items}
		{@const matrixColumns = matrix.columns.items}
		<div class="flex w-full flex-col gap-3">
			<div class="overflow-x-auto">
				<table class="border-collapse text-sm">
					<thead>
						<tr>
							<th class="w-10 px-3 py-2"></th>
							{#each matrixColumns as col (col.id)}
								<th class="px-5 py-2 text-center font-semibold text-gray-700">{col.key}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each matrixRows as row (row.id)}
							<tr>
								<td class="px-3 py-3 font-semibold text-gray-700">{row.key}</td>
								{#each matrixColumns as col (col.id)}
									{@const isChecked = (matrixSelections[String(row.id)] ?? []).includes(col.id)}
									<td class="px-5 py-3 text-center">
										<Checkbox
											checked={isChecked}
											onCheckedChange={() => onMatrixInput?.(String(row.id), col.id)}
										/>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else if question.question_type === question_type_enum.MATRIXRATING}
		{@const matrixOpts = question.options as unknown as TMatrixOptions}
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-xs sm:text-sm">
				<thead>
					<tr>
						<th class="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold">
							{matrixOpts.rows.label}
						</th>
						{#each matrixOpts.columns.items as col (col.id)}
							<th class="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-semibold">
								{col.key}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each matrixOpts.rows.items as row (row.id)}
						<tr class="hover:bg-gray-50">
							<td class="border border-gray-300 px-3 py-2 font-medium">{row.value}</td>
							{#each matrixOpts.columns.items as col (col.id)}
								<td class="border border-gray-300 px-3 py-2 text-center">
									<input
										type="radio"
										name="omr-matrix-{question.id}-row-{row.id}"
										value={col.id}
										checked={matrixResponse[String(row.id)] === col.id}
										class="accent-primary h-4 w-4 cursor-pointer"
										aria-label="{row.value} – {col.key}"
										onchange={() => onMatrixInput?.(row.id, col.id)}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
