<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import {
		buildQuestionSetGroups,
		canAttemptAllQuestions,
		normalizeTestQuestions
	} from '$lib/helpers/questionSetHelpers';
	import { t } from 'svelte-i18n';
	import { question_type_enum } from '$lib/types';
	import { isNumericalAnswerCorrect } from '$lib/helpers/feedbackHelpers';
	import RichText from './RichText.svelte';
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
		if (isCorrect(optionId, correct)) return 'bg-green-100 border-green-500 text-green-700';
		if (isSubmitted(optionId, submitted) && !isCorrect(optionId, correct))
			return 'bg-red-100 border-red-500 text-red-700';
		return '';
	};

	const getOptionStatus = (optionId: number, submitted: number[], correct: number[]) => {
		if (isCorrect(optionId, correct)) return 'correct';
		if (isSubmitted(optionId, submitted)) return 'wrong';
		return 'none';
	};

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
		<span class="flex-end flex gap-1 text-xs font-medium text-green-600"
			>{$t('Correct')}
			<Check size={18} class="text-green-600" />
		</span>
	{:else if answerStatus === 'wrong'}
		<span class="flex-end flex gap-1 text-xs font-medium text-red-600"
			>{$t('Wrong')}
			<X size={18} class="text-red-600" />
		</span>
	{/if}
{/snippet}

{#snippet feedbackCard(item: any, idx: number)}
	<Card.Root class="mb-6 w-full max-w-sm rounded-xl shadow-md">
		<Card.Header class="p-5">
			<Card.Title class="mb-5 border-b pb-3 text-sm">
				{idx + 1} <span>{$t('OF')} {feedbackWithQuestions.length}</span>

				{#if item.question?.marking_scheme}
					{@const mark = item.question.marking_scheme.correct}
					<span class="text-muted-foreground float-end">
						{mark === 1 ? `1 ${$t('Mark')}` : `${mark} ${$t('Marks')}`}
					</span>
				{/if}
			</Card.Title>

			<Card.Description class="text-base font-medium">
				<RichText content={item.question.question_text} />
				{#if item.question.instructions}
					<RichText
						content={item.question.instructions}
						class="text-muted-foreground mt-2 text-sm"
					/>
				{/if}
				<QuestionMedia media={item.question.media} />
			</Card.Description>
		</Card.Header>

		<Card.Content class="p-5 pt-1">
			{#if item.question.question_type === question_type_enum.MATRIXMATCH || item.question.question_type === question_type_enum.MATRIXRATING}
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
				{@const numericalCorrect = isNumericalAnswerCorrect(
					item.question.question_type,
					item.fb.submitted_answer,
					item.fb.correct_answer
				)}
				{@const feedbackClass =
					numericalCorrect === null
						? 'border-gray-300 bg-white text-gray-700'
						: numericalCorrect
							? 'border-green-400 bg-green-100 text-green-700'
							: 'border-red-400 bg-red-100 text-red-700'}

				<div class={`flex rounded-xl border px-4 py-4 ${feedbackClass}`}>
					{#if typeof item.fb.submitted_answer === 'string' && item.fb.submitted_answer.trim()}
						<p class="w-full text-sm whitespace-pre-wrap">{item.fb.submitted_answer}</p>
						{#if numericalCorrect === true}
							{@render showCorrectWrongMark('correct')}
						{:else if numericalCorrect === false}
							{@render showCorrectWrongMark('wrong')}
						{/if}
					{:else}
						<p class="text-muted-foreground text-sm italic">{$t('Not Attempted')}</p>
					{/if}
				</div>
				{#if numericalCorrect === false}
					<div
						class="mt-4 flex flex-row rounded-xl border border-green-400 bg-green-100 px-4 py-4 text-green-700"
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
							<div class="flex w-full items-start justify-between gap-3">
								<div class="flex min-w-0 items-start gap-2">
									<span class="shrink-0">{option.key}.</span>
									<RichText content={option.value} class="min-w-0 flex-1" />
								</div>
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
						<div class="flex w-full items-start justify-between gap-3">
							<div class="flex min-w-0 items-start gap-2">
								<span class="shrink-0">{option.key}.</span>
								<RichText content={option.value} class="min-w-0 flex-1" />
							</div>
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
					{@render feedbackCard(item, group.startIndex + sectionIndex)}
				{/if}
			{/each}
		{/each}
	{:else}
		{#each feedbackWithQuestions as item, idx (item.question.id)}
			{@render feedbackCard(item, idx)}
		{/each}
	{/if}
</div>
