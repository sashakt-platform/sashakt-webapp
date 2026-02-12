<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { t } from 'svelte-i18n';

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

	const feedbackWithQuestions = $derived(
		(testQuestions?.question_revisions ?? [])
			.filter((question: any) => question.question_type !== 'subjective')
			.map((question: any) => {
			const fb = (feedback ?? []).find((f: any) => f.question_revision_id === question.id);

			const feedbackData = fb ?? {
				question_revision_id: question.id,
				submitted_answer: [],
				correct_answer: fb?.correct_answer ?? []
			};
			return { fb: feedbackData, question };
		})
	);
</script>

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
					<Card.Title class="mb-5 border-b pb-3 text-sm">
						{idx + 1} <span>{$t('OF')} {feedbackWithQuestions.length}</span>

						{#if item.question?.marking_scheme}
							<span class="text-muted-foreground float-end">
								{item.question.marking_scheme.correct}
								{$t('Marks')}
							</span>
						{/if}
					</Card.Title>

					<Card.Description class="text-base font-medium">
						{item.question.question_text}
						{#if item.question.instructions}
							<span class="text-muted-foreground mt-2 block text-sm">
								{item.question.instructions}
							</span>
						{/if}
					</Card.Description>
				</Card.Header>

				<Card.Content class="p-5 pt-1">
					{#if item.question.question_type === 'single-choice'}
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
									class={`mb-2 flex cursor-not-allowed items-center justify-between rounded-xl border px-4 py-5 ${optionClass(
										option.id,
										item.fb.submitted_answer,
										item.fb.correct_answer
									)}`}
								>
									<span>{option.key}. {option.value}</span>

									<div class="flex h-6 w-6 items-center justify-center">
										{#if status === 'correct'}
											<Check size={18} class="text-green-600" />
										{:else if status === 'wrong'}
											<X size={18} class="text-red-600" />
										{/if}
									</div>
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
								class={`mb-2 flex w-full cursor-not-allowed items-center justify-between rounded-xl border px-4 py-5 ${optionClass(
									option.id,
									item.fb.submitted_answer,
									item.fb.correct_answer
								)}`}
							>
								<span>{option.key}. {option.value}</span>

								<div class="flex h-6 w-6 items-center justify-center">
									{#if status === 'correct'}
										<Check size={18} class="text-green-600" />
									{:else if status === 'wrong'}
										<X size={18} class="text-red-600" />
									{/if}
								</div>
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
