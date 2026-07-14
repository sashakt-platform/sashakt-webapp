<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import {
		buildQuestionSetGroups,
		canAttemptAllQuestions,
		normalizeTestQuestions
	} from '$lib/helpers/questionSetHelpers';
	import { t } from 'svelte-i18n';
	import { question_type_enum, type TCandidate, type TSelection } from '$lib/types';
	import {
		isNumericalAnswerCorrect,
		getQuestionResult,
		GRADABLE_QUESTION_TYPES,
		parseMatrixAnswer,
		getMatrixCellStatus
	} from '$lib/helpers/feedbackHelpers';
	import { parseJsonRecord } from '$lib/helpers/matrixHelpers';
	import RichText from './RichText.svelte';
	import type { TMatrixOptions, TMatrixInputOptions } from '$lib/types';
	import QuestionMedia from './QuestionMedia.svelte';
	import ResultBadge from './ResultBadge.svelte';
	import { cn } from '$lib/utils';
	import { navState } from '$lib/navState.svelte';
	import ChoiceAnswer from './answer/ChoiceAnswer.svelte';
	import SubjectiveAnswer from './answer/SubjectiveAnswer.svelte';

	let {
		candidate,
		feedback = [],
		testQuestions,
		onBack
	}: { candidate: TCandidate; feedback?: any; testQuestions?: any; onBack?: () => void } = $props();

	$effect(() => {
		navState.onBack = onBack;
		return () => {
			navState.onBack = undefined;
		};
	});

	const toAnswerSelections = (item: any): TSelection[] => [
		{
			question_revision_id: item.question.id,
			response: item.fb.submitted_answer,
			correct_answer: item.fb.correct_answer,
			is_reviewed: true,
			visited: true,
			time_spent: 0,
			bookmarked: false
		}
	];

	const normalizedTestQuestions = $derived(normalizeTestQuestions(testQuestions));

	const feedbackWithQuestions = $derived(
		normalizedTestQuestions.questions.map((question: any) => {
			const fb = (feedback ?? []).find((entry: any) => entry.question_revision_id === question.id);

			const feedbackData = fb ?? {
				question_revision_id: question.id,
				submitted_answer: question.question_type === 'subjective' ? '' : [],
				correct_answer: fb?.correct_answer ?? []
			};

			return { fb: feedbackData, question };
		})
	);

	const feedbackItemByQuestionId = $derived(
		new Map(feedbackWithQuestions.map((item) => [item.question.id, item]))
	);

	const feedbackQuestionSetGroups = $derived(
		buildQuestionSetGroups(normalizedTestQuestions.questions, normalizedTestQuestions.questionSets)
	);
</script>

{#snippet showCorrectWrongMark(answerStatus: string)}
	{#if answerStatus === 'correct'}
		<Check size={18} class="text-success" />
	{:else if answerStatus === 'wrong'}
		<X size={18} class="text-error" />
	{/if}
{/snippet}

{#snippet feedbackCard_1(item: any, idx: number)}
	{#if item.question}
		<Card.Root class="w-full max-w-2xl rounded-[14px] shadow-none md:max-w-250">
			<Card.Header class="p-4 lg:p-6">
				<Card.Title class="mb-5 flex items-center justify-between">
					<span
						class="bg-secondary text-primary inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
					>
						Q{idx + 1}
					</span>

					{#if item.question?.marking_scheme && GRADABLE_QUESTION_TYPES.has(item.question.question_type)}
						<ResultBadge
							result={getQuestionResult(
								item.question.question_type,
								item.fb.submitted_answer,
								item.fb.correct_answer
							)}
							scheme={item.question.marking_scheme}
						/>
					{/if}
				</Card.Title>

				<Card.Description class="text-base font-medium">
					<RichText content={item.question.question_text} />
					{#if item.question.instructions}
						<span class="text-muted-foreground mt-2 block text-sm">
							<RichText content={item.question.instructions} />
						</span>
					{/if}
					<QuestionMedia media={item.question.media} />
				</Card.Description>
			</Card.Header>

			<Card.Content class="p-4 pt-1 lg:p-6 lg:pt-1">
				{#if item.question.question_type === question_type_enum.MATRIXRATING}
					{@const matrixOpts = item.question.options as TMatrixOptions}
					{@const matrixRows = matrixOpts.rows.items}
					{@const matrixColumns = matrixOpts.columns.items}
					{@const matrixRatingAnswer = parseJsonRecord<number>(item.fb.submitted_answer)}
					<div class="overflow-x-auto rounded-lg">
						<table class="border-border min-w-full border-collapse border text-sm">
							<thead>
								<tr class="border-border h-16 border-b">
									<th class="bg-muted text-muted-foreground min-w-55 px-5 text-left font-bold">
										{matrixOpts.rows.label}
									</th>
									{#each matrixColumns as col (col.id)}
										<th class="bg-muted text-muted-foreground px-5 text-center font-bold">
											<span class="block">{col.value}</span>
											<span class="block">({col.key})</span>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each matrixRows as row (row.id)}
									<tr class="border-border border-b">
										<td class="min-w-55 px-4 py-3 font-medium wrap-break-word whitespace-normal">
											{row.value}
										</td>
										{#each matrixColumns as col (col.id)}
											<td class="px-4 py-3 text-center">
												<input
													type="radio"
													name="feedback-matrix-{item.question.id}-row-{row.id}"
													value={col.id}
													checked={matrixRatingAnswer[String(row.id)] === col.id}
													disabled
													class="accent-primary h-4 w-4 disabled:opacity-100"
												/>
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if item.question.question_type === question_type_enum.MATRIXINPUT}
					{@const matrixOpts = item.question.options as unknown as TMatrixInputOptions}
					{@const inputType = matrixOpts.columns.input_type}
					{@const matrixInputAnswer = parseJsonRecord<string>(item.fb.submitted_answer)}
					<div class="overflow-x-auto">
						<div class="border-border overflow-hidden rounded-xl border">
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
										<tr class="border-border border-b last:border-b-0">
											<td class="w-1/2 px-4 py-3 font-medium">{row.value}</td>
											<td class="w-1/2 px-4 py-3">
												<input
													type={inputType}
													readonly
													class="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
													value={matrixInputAnswer[String(row.id)] ?? ''}
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{:else if item.question.question_type === question_type_enum.MATRIXMATCH}
					{@const matrix = item.question.options as TMatrixOptions}
					{@const matrixRows = matrix.rows.items}
					{@const matrixColumns = matrix.columns.items}
					{@const submittedMatrix = parseMatrixAnswer(item.fb.submitted_answer)}
					{@const correctMatrix = parseMatrixAnswer(item.fb.correct_answer)}

					<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="border-border overflow-hidden rounded-xl border">
							<div
								class="bg-muted text-foreground py-3 text-center text-xs font-bold tracking-widest uppercase"
							>
								{matrix.rows.label}
							</div>
							{#each matrixRows as row (row.id)}
								<div class="border-border flex items-start gap-3 border-t px-4 py-3">
									<span class="text-foreground min-w-4 shrink-0 text-sm font-bold">{row.key}</span>
									<span class="text-foreground text-sm">{row.value}</span>
								</div>
							{/each}
						</div>
						<div class="border-border overflow-hidden rounded-xl border">
							<div
								class="bg-muted text-foreground py-3 text-center text-xs font-bold tracking-widest uppercase"
							>
								{matrix.columns.label}
							</div>
							{#each matrixColumns as col (col.id)}
								<div class="border-border flex items-start gap-3 border-t px-4 py-3">
									<span class="text-foreground min-w-4 shrink-0 text-sm font-bold">{col.key}</span>
									<span class="text-foreground text-sm">{col.value}</span>
								</div>
							{/each}
						</div>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr class="bg-muted">
									<th class="border-border w-14 border px-4 py-3"></th>
									{#each matrixColumns as col (col.id)}
										<th
											class="border-border text-foreground min-w-16 border px-4 py-3 text-center font-semibold"
										>
											{col.key}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each matrixRows as row (row.id)}
									<tr class="border-border border-t">
										<td
											class="border-border text-foreground border px-4 py-3 text-center text-sm font-semibold"
										>
											{row.key}
										</td>
										{#each matrixColumns as col (col.id)}
											{@const status = getMatrixCellStatus(
												row.id,
												col.id,
												submittedMatrix,
												correctMatrix
											)}
											<td class="border-border border px-4 py-3 text-center">
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
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if item.question.question_type === question_type_enum.SUBJECTIVE}
					<SubjectiveAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
				{:else if item.question.question_type === question_type_enum.NUMERICALINTEGER || item.question.question_type === question_type_enum.NUMERICALDECIMAL}
					{@const isCorrect = isNumericalAnswerCorrect(
						item.question.question_type,
						item.fb.submitted_answer,
						item.fb.correct_answer
					)}
					{@const feedbackClass =
						isCorrect === null
							? 'border-border bg-card text-card-foreground'
							: isCorrect
								? 'border-success bg-success-subtle text-success'
								: 'border-error bg-error-subtle text-error'}

					<div class={`flex rounded-xl border px-4 py-4 ${feedbackClass}`}>
						{#if typeof item.fb.submitted_answer === 'string' && item.fb.submitted_answer.trim()}
							<p class="w-full text-sm whitespace-pre-wrap">{item.fb.submitted_answer}</p>
							{#if isCorrect === true}
								{@render showCorrectWrongMark('correct')}
							{:else if isCorrect === false}
								{@render showCorrectWrongMark('wrong')}
							{/if}
						{:else}
							<p class="text-muted-foreground text-sm italic">{$t('Not Attempted')}</p>
						{/if}
					</div>
					{#if isCorrect === false}
						<div
							class="border-success bg-success-subtle text-success mt-4 flex flex-row rounded-xl border px-4 py-4"
						>
							<p class="w-full text-sm whitespace-pre-wrap">{item.fb.correct_answer}</p>
							{@render showCorrectWrongMark('correct')}
						</div>
					{/if}
				{:else if item.question.question_type === question_type_enum.SINGLE || item.question.question_type === question_type_enum.MULTIPLE}
					<ChoiceAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-error text-center text-sm">
			{$t('Question not found for feedback #{number}', { values: { number: idx + 1 } })}
		</p>
	{/if}
{/snippet}

<div class="bg-muted min-h-screen">
	<div class="flex flex-col items-center px-4 py-6">
		<h1 class="text-foreground mb-6 text-xl font-semibold">{$t('Answer Review')}</h1>
		{#if feedbackWithQuestions.length === 0}
			<p class="text-muted-foreground mt-10 text-center text-sm">
				{$t('No feedback available. You did not attempt any questions.')}
			</p>
		{/if}
		{#if feedbackQuestionSetGroups.length > 0}
			{#each feedbackQuestionSetGroups as group (`${group.section.id ?? group.section.title}-${group.startIndex}`)}
				<div class="mb-4 w-full max-w-sm rounded-2xl border bg-slate-50 p-4">
					<p class="text-sm font-semibold text-slate-800">{group.section.title}</p>
					{#if group.section.description}
						<RichText
							content={group.section.description}
							class="text-muted-foreground mt-1 text-sm"
						/>
					{/if}
					<p class="text-muted-foreground mt-2 text-sm">
						{#if canAttemptAllQuestions(group.section.max_questions_allowed_to_attempt, group.questions.length)}
							{$t('You may attempt all questions in this section.')}
						{:else}
							{$t('You may attempt up to {count} questions in this section.', {
								values: { count: group.section.max_questions_allowed_to_attempt }
							})}
						{/if}
					</p>
				</div>
				{#each group.questions as question, sectionIndex (question.id)}
					{@const item = feedbackItemByQuestionId.get(question.id)}
					{#if item}
						{@render feedbackCard_1(item, group.startIndex + sectionIndex)}
					{/if}
				{/each}
			{/each}
		{:else}
			<div class="flex w-full flex-col items-center gap-6">
				{#each feedbackWithQuestions as item, idx (item.question.id)}
					{@render feedbackCard_1(item, idx)}
				{/each}
			</div>
		{/if}
	</div>
</div>
