<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { normalizeTestQuestions } from '$lib/helpers/questionSetHelpers';
	import { t } from 'svelte-i18n';
	import { question_type_enum } from '$lib/types';
	import { isNumericalAnswerCorrect } from '$lib/helpers/feedbackHelpers';
	import QuestionMedia from './QuestionMedia.svelte';

	let {
		feedback = [],
		testQuestions,
		onBack
	}: { feedback?: any; testQuestions?: any; onBack?: () => void } = $props();

	const isCorrect = (optionId: number, correctAnswer: number[]) => correctAnswer.includes(optionId);

	const isSubmitted = (optionId: number, submittedAnswer: number[]) =>
		submittedAnswer.includes(optionId);

	const optionClass = (optionId: number, submitted: number[], correct: number[]) => {
		if (isCorrect(optionId, correct)) return 'bg-success-subtle border-success text-success';
		if (isSubmitted(optionId, submitted) && !isCorrect(optionId, correct))
			return 'bg-error-subtle border-error text-error';
		return '';
	};

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

	const getQuestionResult = (question: any, fb: any): 'correct' | 'incorrect' | 'unattempted' => {
		const submitted = fb.submitted_answer;
		const correct = fb.correct_answer;

		if (
			question.question_type === question_type_enum.NUMERICALINTEGER ||
			question.question_type === question_type_enum.NUMERICALDECIMAL
		) {
			const result = isNumericalAnswerCorrect(question.question_type, submitted, correct);
			if (result === null) return 'unattempted';
			return result ? 'correct' : 'incorrect';
		}

		if (question.question_type === 'subjective') {
			return typeof submitted === 'string' && submitted.trim() ? 'incorrect' : 'unattempted';
		}

		if (!Array.isArray(submitted) || submitted.length === 0) return 'unattempted';

		const correctSet = new Set(correct);
		const submittedSet = new Set(submitted);
		if (
			submittedSet.size === correctSet.size &&
			[...submittedSet].every((id) => correctSet.has(id))
		) {
			return 'correct';
		}
		return 'incorrect';
	};
</script>

{#snippet showCorrectWrongMark(answerStatus: string)}
	{#if answerStatus === 'correct'}
		<Check size={16} class="text-success" />
	{:else if answerStatus === 'wrong'}
		<X size={16} class="text-error" />
	{/if}
{/snippet}

<div class="flex flex-col items-center">
	{#if onBack}
		<div class="mb-4 w-full max-w-sm">
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
			<Card.Root class="mb-6 w-full max-w-sm rounded-xl shadow-md">
				<Card.Header class="p-5">
					<Card.Title class="mb-5 flex items-center justify-between border-b pb-3">
						<span
							class="bg-secondary text-primary inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
						>
							Q{idx + 1}
						</span>

						{@const gradableTypes = new Set([
							'single-choice',
							'multi-choice',
							question_type_enum.NUMERICALINTEGER,
							question_type_enum.NUMERICALDECIMAL
						])}
						{#if item.question?.marking_scheme && gradableTypes.has(item.question.question_type)}
							{@const result = getQuestionResult(item.question, item.fb)}
							{@const scheme = item.question.marking_scheme}
							{#if result === 'correct'}
								<span
									class="bg-success-subtle text-success rounded-full px-3 py-1 text-xs font-medium"
								>
									{$t('Correct')}: +{scheme.correct}
									{scheme.correct === 1 ? $t('mark') : $t('marks')}
								</span>
							{:else if result === 'incorrect'}
								<span class="bg-error-subtle text-error rounded-full px-3 py-1 text-xs font-medium">
									{$t('Incorrect')}: {scheme.wrong}
									{Math.abs(scheme.wrong) === 1 ? $t('mark') : $t('marks')}
								</span>
							{:else}
								<span
									class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium"
								>
									{$t('Not Attempted')}: 0 {$t('mark')}
								</span>
							{/if}
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

				<Card.Content class="p-5 pt-1">
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
					{:else if item.question.question_type === 'single-choice'}
						<RadioGroup.Root value={item.fb.submitted_answer[0]?.toString()} disabled>
							{#each item.question.options as option (option.id)}
								{@const uid = `${item.question.id}-${option.key}`}
								{@const status = getOptionStatus(
									option.id,
									item.fb.submitted_answer,
									item.fb.correct_answer
								)}

								<Label
									for={uid}
									class={`mb-2 flex cursor-not-allowed flex-col rounded-xl border px-4 py-5 ${optionClass(
										option.id,
										item.fb.submitted_answer,
										item.fb.correct_answer
									)}`}
								>
									<div class="flex w-full items-center justify-between">
										<span>{option.key}. {option.value}</span>
										<div class="flex items-center gap-1">
											{#if status === 'correct'}
												{@render showCorrectWrongMark('correct')}
											{:else if status === 'wrong'}
												{@render showCorrectWrongMark('wrong')}
											{/if}
										</div>
									</div>
									{#if option.media}
										<QuestionMedia media={option.media} />
									{/if}
								</Label>
							{/each}
						</RadioGroup.Root>
					{:else}
						{#each item.question.options as option (option.id)}
							{@const uid = `${item.question.id}-${option.key}`}
							{@const status = getOptionStatus(
								option.id,
								item.fb.submitted_answer,
								item.fb.correct_answer
							)}

							<Label
								for={uid}
								class={`mb-2 flex w-full cursor-not-allowed flex-col rounded-xl border px-4 py-5 ${optionClass(
									option.id,
									item.fb.submitted_answer,
									item.fb.correct_answer
								)}`}
							>
								<div class="flex w-full items-center justify-between">
									<span>{option.key}. {option.value}</span>
									<div class="flex items-center gap-1">
										{#if status === 'correct'}
											{@render showCorrectWrongMark('correct')}
										{:else if status === 'wrong'}
											{@render showCorrectWrongMark('wrong')}
										{/if}
									</div>
								</div>
								{#if option.media}
									<QuestionMedia media={option.media} />
								{/if}
							</Label>
						{/each}
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
