<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import {
		buildQuestionSetGroups,
		canAttemptAllQuestions,
		normalizeTestQuestions
	} from '$lib/helpers/questionSetHelpers';
	import { t } from 'svelte-i18n';
	import { question_type_enum, type TCandidate, type TSelection } from '$lib/types';
	import { getQuestionResult, GRADABLE_QUESTION_TYPES } from '$lib/helpers/feedbackHelpers';
	import RichText from './RichText.svelte';
	import QuestionMedia from './QuestionMedia.svelte';
	import ResultBadge from './ResultBadge.svelte';
	import { navState } from '$lib/navState.svelte';
	import ChoiceAnswer from './answer/ChoiceAnswer.svelte';
	import SubjectiveAnswer from './answer/SubjectiveAnswer.svelte';
	import NumericalAnswer from './answer/NumericalAnswer.svelte';
	import MatrixRatingAnswer from './answer/MatrixRatingAnswer.svelte';
	import MatrixMatchAnswer from './answer/MatrixMatchAnswer.svelte';
	import MatrixInputAnswer from './answer/MatrixInputAnswer.svelte';

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
					<MatrixRatingAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
				{:else if item.question.question_type === question_type_enum.MATRIXINPUT}
					<MatrixInputAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
				{:else if item.question.question_type === question_type_enum.MATRIXMATCH}
					<MatrixMatchAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
				{:else if item.question.question_type === question_type_enum.SUBJECTIVE}
					<SubjectiveAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
				{:else if item.question.question_type === question_type_enum.NUMERICALINTEGER || item.question.question_type === question_type_enum.NUMERICALDECIMAL}
					<NumericalAnswer
						question={item.question}
						{candidate}
						selections={toAnswerSelections(item)}
						variant="card"
					/>
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
