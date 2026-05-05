<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { normalizeTestQuestions } from '$lib/helpers/questionSetHelpers';
	import { t } from 'svelte-i18n';
	import { question_type_enum } from '$lib/types';
	import type { TOptions } from '$lib/types';
	import { isNumericalAnswerCorrect, getQuestionResult } from '$lib/helpers/feedbackHelpers';
	import QuestionMedia from './QuestionMedia.svelte';
	import ResultBadge from './ResultBadge.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { cn } from '$lib/utils';

	let {
		feedback = [],
		testQuestions,
		onBack
	}: { feedback?: any; testQuestions?: any; onBack?: () => void } = $props();

	const isCorrect = (optionId: number, correctAnswer: number[]) => correctAnswer.includes(optionId);

	const isSubmitted = (optionId: number, submittedAnswer: number[]) =>
		submittedAnswer.includes(optionId);

	const getOptionStatus = (optionId: number, submitted: number[], correct: number[]) => {
		if (isCorrect(optionId, correct)) return 'correct';
		if (isSubmitted(optionId, submitted)) return 'wrong';
		return 'none';
	};

	const questions = $derived(normalizeTestQuestions(testQuestions).questions);

	const feedbackWithQuestions = $derived(
		questions.map((question: any) => {
			const fb = (feedback ?? []).find((f: any) => f.question_revision_id === question.id);

			const feedbackData = fb ?? {
				question_revision_id: question.id,
				submitted_answer: question.question_type === 'subjective' ? '' : [],
				correct_answer: fb?.correct_answer ?? []
			};
			return { fb: feedbackData, question };
		})
	);
</script>

{#snippet showCorrectWrongMark(answerStatus: string)}
	{#if answerStatus === 'correct'}
		<Check size={16} class="text-success" />
	{:else if answerStatus === 'wrong'}
		<X size={16} class="text-error" />
	{/if}
{/snippet}

<div class="flex flex-col items-center md:min-h-screen md:gap-8 md:p-6">
	{#if onBack}
		<div class="mb-4 w-full max-w-sm md:mb-0 md:max-w-250">
			<Button variant="ghost" size="sm" onclick={onBack}>
				<ArrowLeft size={16} class="mr-1" />
				{$t('Back to Results')}
			</Button>
		</div>
	{/if}
	{#if feedbackWithQuestions.length === 0}
		<p class="text-muted-foreground mt-10 text-center text-sm">
			{$t('No feedback available. You did not attempt any questions.')}
		</p>
	{/if}
	{#each feedbackWithQuestions as item, idx (item.question.id)}
		{#if item.question}
			<Card.Root class="mb-6 w-full max-w-sm rounded-[14px] shadow-md md:mb-0 md:max-w-250">
				<Card.Header class="p-4 lg:p-6">
					<Card.Title class="mb-5 flex items-center justify-between">
						<span
							class="bg-secondary text-primary inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
						>
							Q{idx + 1}
						</span>

						{@const gradableTypes = new Set([
							question_type_enum.SINGLE,
							question_type_enum.MULTIPLE,
							question_type_enum.NUMERICALINTEGER,
							question_type_enum.NUMERICALDECIMAL
						])}
						{#if item.question?.marking_scheme && gradableTypes.has(item.question.question_type)}
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
						{item.question.question_text}
						{#if item.question.instructions}
							<span class="text-muted-foreground mt-2 block text-sm">
								{item.question.instructions}
							</span>
						{/if}
						<QuestionMedia media={item.question.media} />
					</Card.Description>
				</Card.Header>

				<Card.Content class="p-4 pt-1 lg:p-6 lg:pt-1">
					{#if item.question.question_type === question_type_enum.MATRIXMATCH || item.question.question_type === question_type_enum.MATRIXRATING || item.question.question_type === question_type_enum.MATRIXINPUT}
						<p class="text-muted-foreground text-sm italic">{$t('Not Applicable')}</p>
					{:else if item.question.question_type === 'subjective'}
						<div class="rounded-xl border px-4 py-4">
							{#if typeof item.fb.submitted_answer === 'string' && item.fb.submitted_answer.trim()}
								<p class="text-sm whitespace-pre-wrap">{item.fb.submitted_answer}</p>
							{:else}
								<p class="text-muted-foreground text-sm italic">{$t('Not Attempted')}</p>
							{/if}
						</div>
						{#if item.question.subjective_answer_limit}
							<p class="text-muted-foreground mt-2 text-xs">
								{$t('Up to {max} characters', {
									values: { max: item.question.subjective_answer_limit }
								})}
							</p>
						{/if}
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
						{#if !isCorrect}
							<div
								class="border-success bg-success-subtle text-success mt-4 flex flex-row rounded-xl border px-4 py-4"
							>
								<p class="w-full text-sm whitespace-pre-wrap">{item.fb.correct_answer}</p>
								{@render showCorrectWrongMark('correct')}
							</div>
						{/if}
					{:else if item.question.question_type === question_type_enum.SINGLE}
						<RadioGroup.Root
							value={item.fb.submitted_answer[0]?.toString()}
							disabled
							class="flex flex-col gap-3"
						>
							{#each item.question.options as TOptions[] as option (option.id)}
								{@const uid = `${item.question.id}-${option.key}`}
								{@const correct = isCorrect(option.id, item.fb.correct_answer)}
								{@const submitted = isSubmitted(option.id, item.fb.submitted_answer)}
								{@const status = getOptionStatus(
									option.id,
									item.fb.submitted_answer,
									item.fb.correct_answer
								)}
								{@const labelClass = correct
									? 'bg-success-subtle border-success '
									: submitted
										? 'bg-error-subtle border-error'
										: 'border-border bg-card'}
								{@const itemClass = correct
									? 'border-success text-success'
									: submitted
										? 'border-error text-error'
										: ''}
								<div class="flex items-start gap-3">
									<span class=" mt-3 w-5 shrink-0 text-sm font-medium">{option.key}</span>
									<Label
										for={uid}
										class={cn(
											'flex flex-1 cursor-not-allowed flex-col rounded-xl border transition-colors',
											labelClass
										)}
									>
										<div class="flex items-center gap-3 px-4 py-3">
											<RadioGroup.Item
												value={option.id.toString()}
												id={uid}
												disabled
												class={itemClass}
											/>
											<span class="text-foreground flex-1 text-sm">{option.value}</span>
											{#if status === 'correct'}
												{@render showCorrectWrongMark('correct')}
											{:else if status === 'wrong'}
												{@render showCorrectWrongMark('wrong')}
											{/if}
										</div>
										{#if option.media}
											<div class="px-4 pb-4"><QuestionMedia media={option.media} /></div>
										{/if}
									</Label>
								</div>
							{/each}
						</RadioGroup.Root>
					{:else}
						<div class="flex flex-col gap-3">
							{#each item.question.options as TOptions[] as option (option.id)}
								{@const uid = `${item.question.id}-${option.key}`}
								{@const correct = isCorrect(option.id, item.fb.correct_answer)}
								{@const submitted = isSubmitted(option.id, item.fb.submitted_answer)}
								{@const status = getOptionStatus(
									option.id,
									item.fb.submitted_answer,
									item.fb.correct_answer
								)}
								{@const labelClass = correct
									? 'bg-success-subtle border-success'
									: submitted
										? 'bg-error-subtle border-error'
										: 'border-border bg-card'}
								<div class="flex items-start gap-3">
									<span class="text-muted-foreground mt-3 w-5 shrink-0 text-sm font-medium"
										>{option.key}</span
									>
									<Label
										for={uid}
										class={cn(
											'flex flex-1 cursor-not-allowed flex-col rounded-xl border transition-colors',
											labelClass
										)}
									>
										<div class="flex items-center gap-3 px-4 py-3">
											<Checkbox
												id={uid}
												checked={submitted}
												disabled
												class={cn(
													correct && submitted && 'border-success data-[state=checked]:bg-success',
													!correct && submitted && 'border-error data-[state=checked]:bg-error',
													correct && !submitted && 'border-success'
												)}
											/>
											<span class="text-foreground flex-1 text-sm">{option.value}</span>
											{#if status === 'wrong'}
												{@render showCorrectWrongMark('wrong')}
											{/if}
										</div>
										{#if option.media}
											<div class="px-4 pb-4"><QuestionMedia media={option.media} /></div>
										{/if}
									</Label>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{:else}
			<p class="text-center text-sm text-red-500">
				{$t('Question not found for feedback #{number}', { values: { number: idx + 1 } })}
			</p>
		{/if}
	{/each}
</div>
