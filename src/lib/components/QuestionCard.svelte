<script lang="ts">
	import { page } from '$app/state';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Spinner } from '$lib/components/ui/spinner';
	import { createTestSessionStore } from '$lib/helpers/testSession';
	import type { TCandidate, TQuestion, TSelection } from '$lib/types';
	import { t } from 'svelte-i18n';

	let {
		question,
		serialNumber,
		candidate,
		totalQuestions,
		selectedQuestions = $bindable(),
		showFeedback = false
	}: {
		question: TQuestion;
		candidate: TCandidate;
		serialNumber: number;
		totalQuestions: number;
		selectedQuestions: TSelection[];
		showFeedback?: boolean;
	} = $props();

	const options = question.options;

	// key to force remount of RadioGroup on error, this is to prevent radio button from being checked
	let radioGroupKey = $state(0);
	let isSubmitting = $state(false);
	let saveError = $state<string | null>(null);

	const sessionStore = createTestSessionStore(candidate);
	const selectedQuestion = (questionId: number) => {
		return selectedQuestions.find((item) => item.question_revision_id === questionId);
	};

	const currentSelection = $derived(selectedQuestion(question.id));
	const correctAnswer = $derived(currentSelection?.correct_answer ?? null);
	const hasFeedbackAvailable = $derived((currentSelection?.response?.length ?? 0) > 0);
	const isFeedbackViewed = $derived(currentSelection?.is_reviewed === true);
	const isLocked = $derived(isFeedbackViewed);

	const getExistingTextResponse = () => {
		const selected = selectedQuestion(question.id);
		return typeof selected?.response === 'string' ? selected.response : '';
	};
	let subjectiveText = $state(getExistingTextResponse());
	let lastSavedText = $state(getExistingTextResponse());

	const hasUnsavedChanges = $derived(subjectiveText.trim() !== lastSavedText.trim());
	const hasSavedBefore = $derived(lastSavedText.trim().length > 0);

	const isSelected = (optionId: number) => {
		const selected = selectedQuestion(question.id);
		return selected?.response.includes(optionId);
	};

	const optionFeedbackClass = (optionId: number) => {
		if (!isFeedbackViewed || !correctAnswer) return '';
		if (correctAnswer.includes(optionId)) {
			return 'bg-green-100 border-green-500 text-green-700';
		}
		if (currentSelection?.response.includes(optionId)) {
			return 'bg-red-100 border-red-500 text-red-700';
		}
		return '';
	};

	const getOptionFeedbackStatus = (optionId: number): 'correct' | 'wrong' | 'none' => {
		if (!isFeedbackViewed || !correctAnswer) return 'none';
		if (correctAnswer.includes(optionId)) return 'correct';
		if (currentSelection?.response.includes(optionId)) return 'wrong';
		return 'none';
	};

	const updateStore = () => {
		sessionStore.current = {
			...sessionStore.current,
			candidate,
			selections: selectedQuestions
		};
	};

	const confirmViewFeedback = async () => {
		const answeredQuestion = selectedQuestion(question.id);
		const currentResponse = answeredQuestion?.response ?? [];
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		selectedQuestions = selectedQuestions.map((q) =>
			q.question_revision_id === question.id ? { ...q, is_reviewed: true } : q
		);
		updateStore();

		try {
			const result = await submitAnswer(question.id, currentResponse, currentBookmarked, true);
			if (result?.correct_answer) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === question.id
						? { ...q, correct_answer: result.correct_answer }
						: q
				);
				updateStore();
			}
		} catch {
			// Question stays locked — user already saw the correct answer
		}
	};

	const handleSelection = async (questionId: number, optionId: number, isRemoving = false) => {
		if (isLocked) return;

		const answeredQuestion = selectedQuestion(questionId);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		let newResponse: number[];
		if (isRemoving) {
			if (!answeredQuestion || typeof answeredQuestion.response === 'string') return;
			newResponse = answeredQuestion.response.filter((id) => id !== optionId);
		} else {
			if (question.question_type === 'single-choice') {
				newResponse = [optionId];
			} else {
				const existingResponse =
					answeredQuestion && typeof answeredQuestion.response !== 'string'
						? answeredQuestion.response
						: [];
				newResponse = [...existingResponse, optionId];
			}
		}

		if (question.question_type === 'single-choice' && !isRemoving) {
			if (isSubmitting) {
				return;
			}
			isSubmitting = true;
			saveError = null;
			try {
				await submitAnswer(questionId, newResponse, currentBookmarked);

				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId ? { ...q, response: newResponse } : q
					);
				} else {
					selectedQuestions = [
						...selectedQuestions,
						{
							question_revision_id: questionId,
							response: newResponse,
							visited: true,
							time_spent: 0,
							bookmarked: currentBookmarked,
							is_reviewed: false
						}
					];
				}
				updateStore();
			} catch {
				// force complete remount of RadioGroup
				radioGroupKey++;
				saveError = 'Failed to save your answer. Please try again.';
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		} else {
			if (isSubmitting) {
				return;
			}
			isSubmitting = true;
			saveError = null;
			const previousState = JSON.parse(JSON.stringify(selectedQuestions));

			if (isRemoving) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === questionId && typeof q.response !== 'string'
						? { ...q, response: q.response.filter((id) => id !== optionId) }
						: q
				);
			} else {
				if (answeredQuestion) {
					selectedQuestions = selectedQuestions.map((q) =>
						q.question_revision_id === questionId ? { ...q, response: newResponse } : q
					);
				} else {
					selectedQuestions = [
						...selectedQuestions,
						{
							question_revision_id: questionId,
							response: newResponse,
							visited: true,
							time_spent: 0,
							bookmarked: currentBookmarked,

							is_reviewed: false
						}
					];
				}
			}
			updateStore();

			try {
				await submitAnswer(questionId, newResponse);
			} catch {
				// revert on error
				selectedQuestions = previousState;
				updateStore();
				saveError = 'Failed to save your answer. Please try again.';
				setTimeout(() => (saveError = null), 5000);
			} finally {
				isSubmitting = false;
			}
		}
	};

	const submitAnswer = async (
		questionId: number,
		response: number[] | string,
		bookmarked?: boolean,
		is_reviewed?: boolean
	) => {
		const data = {
			question_revision_id: questionId,
			response: response.length > 0 ? response : null,
			candidate,
			bookmarked,
			is_reviewed
		};

		try {
			const res = await fetch(`/test/${page.params.slug}/api/submit-answer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Failed to submit answer');
			}

			return await res.json();
		} catch (error) {
			console.error('Failed to submit answer:', error);
			throw error;
		}
	};

	const handleBookmark = async () => {
		if (isLocked) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;
		const newBookmarked = !currentBookmarked;
		const currentResponse = answeredQuestion?.response;

		if (isSubmitting) return;
		isSubmitting = true;
		saveError = null;

		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id
					? { ...q, bookmarked: newBookmarked, visited: true }
					: q
			);
		} else {
			const defaultResponse = question.question_type === 'subjective' ? '' : [];
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: defaultResponse,
					visited: true,
					time_spent: 0,
					bookmarked: newBookmarked,
					is_reviewed: false
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, currentResponse ?? [], newBookmarked);
		} catch {
			// revert on error
			if (answeredQuestion) {
				selectedQuestions = selectedQuestions.map((q) =>
					q.question_revision_id === question.id ? { ...q, bookmarked: currentBookmarked } : q
				);
			} else {
				selectedQuestions = selectedQuestions.filter((q) => q.question_revision_id !== question.id);
			}
			updateStore();
			saveError = 'Failed to save bookmark. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};

	const isQuestionBookmarked = $derived(selectedQuestion(question.id)?.bookmarked ?? false);

	const handleSubjectiveSubmit = async () => {
		if (isSubmitting) return;

		const answeredQuestion = selectedQuestion(question.id);
		const currentBookmarked = answeredQuestion?.bookmarked ?? false;

		isSubmitting = true;
		saveError = null;

		const previousState = JSON.parse(JSON.stringify(selectedQuestions));

		if (answeredQuestion) {
			selectedQuestions = selectedQuestions.map((q) =>
				q.question_revision_id === question.id ? { ...q, response: subjectiveText } : q
			);
		} else {
			selectedQuestions = [
				...selectedQuestions,
				{
					question_revision_id: question.id,
					response: subjectiveText,
					visited: true,
					time_spent: 0,
					bookmarked: currentBookmarked
				}
			];
		}
		updateStore();

		try {
			await submitAnswer(question.id, subjectiveText, currentBookmarked);
			lastSavedText = subjectiveText;
		} catch {
			selectedQuestions = previousState;
			updateStore();
			saveError = 'Failed to save your answer. Please try again.';
			setTimeout(() => (saveError = null), 5000);
		} finally {
			isSubmitting = false;
		}
	};
</script>

<Card.Root
	class="mb-4 w-full rounded-xl shadow-md {isSubmitting ? 'pointer-events-none opacity-60' : ''}"
>
	<Card.Header class="p-5">
		<Card.Title class="mb-5 border-b pb-3 text-sm">
			{serialNumber} <span>{$t('OF')} {totalQuestions}</span>
			{#if question?.marking_scheme}
				{@const mark = question.marking_scheme.correct}
				{@const scheme = question.marking_scheme}
				<span class="group relative float-end cursor-help select-none">
					<span class="text-muted-foreground inline-flex items-center gap-1">
						{mark === 1 ? `1 ${$t('Mark')}` : `${mark} ${$t('Marks')}`}
						<Info size={13} class="text-muted-foreground/60" />
					</span>
					<div
						class="absolute top-full right-0 z-20 mt-1 hidden min-w-48 rounded-lg border bg-white p-3 text-xs shadow-lg group-hover:block"
					>
						<p class="text-foreground mb-2 font-semibold">{$t('Marking Scheme')}</p>
						<div class="space-y-1.5">
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">{$t('Correct')}</span>
								<span class="font-medium text-green-600">+{scheme.correct}</span>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">{$t('Wrong')}</span>
								<span class="font-medium {scheme.wrong < 0 ? 'text-red-600' : 'text-foreground'}"
									>{scheme.wrong > 0 ? `+${scheme.wrong}` : scheme.wrong}</span
								>
							</div>
							<div class="flex justify-between gap-4">
								<span class="text-muted-foreground">{$t('Skipped')}</span>
								<span class="text-foreground font-medium">{scheme.skipped}</span>
							</div>
						</div>
						{#if scheme.partial?.correct_answers?.length && question.question_type === 'multi-choice'}
							<div class="border-muted-foreground/20 mt-2.5 border-t pt-2.5">
								<p class="text-foreground mb-1.5 font-semibold">{$t('Partial Marks')}</p>
								<div class="space-y-1.5">
									{#each scheme.partial.correct_answers as rule}
										<div class="flex justify-between gap-4">
											<span class="text-muted-foreground"
												>{rule.num_correct_selected}
												{rule.num_correct_selected === 1
													? $t('correct selected')
													: $t('correct selected_plural')}</span
											>
											<span class="font-medium text-green-600">+{rule.marks}</span>
										</div>
									{/each}
								</div>
								{#if scheme.wrong < 0}
									<p class="text-muted-foreground mt-2 text-[11px] leading-snug">
										{$t('Selecting any incorrect option accrues')}
										<span class="font-medium text-red-600">{scheme.wrong}</span>
										{Math.abs(scheme.wrong) === 1 ? $t('mark') : $t('marks')}
									</p>
								{/if}
							</div>
						{/if}
					</div>
				</span>
			{/if}
			{#if isSubmitting}
				<span class="float-end mr-2"><Spinner /></span>
			{/if}
		</Card.Title>
		<Card.Description class="text-base/normal font-medium">
			{question.question_text}
			{#if question.is_mandatory}
				<span class="ml-1 text-red-500">*</span>
			{/if}
			{#if question.instructions}
				<span class="text-muted-foreground mt-2 block text-sm">
					{question.instructions}
				</span>
			{/if}
		</Card.Description>
	</Card.Header>

	<Card.Content class="p-5 pt-1">
		{#if saveError}
			<div
				class="border-destructive bg-destructive/10 text-destructive mb-4 rounded-lg border p-3 text-sm"
			>
				{saveError}
			</div>
		{/if}
		{#if question.question_type === 'single-choice'}
			{#key radioGroupKey}
				<RadioGroup.Root
					onValueChange={async (optionId) => {
						await handleSelection(question.id, Number(optionId));
					}}
					value={(() => {
						const resp = selectedQuestion(question.id)?.response;
						return typeof resp !== 'string' ? resp?.[0]?.toString() : undefined;
					})()}
					disabled={isLocked}
				>
					{#each options as option, index (index)}
						{@const uid = `${question.id}-${option.key}`}
						{@const feedbackClass = optionFeedbackClass(option.id)}
						{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
						<Label
							for={uid}
							class={`cursor-pointer space-x-2 rounded-xl border px-4 py-5 ${
								isFeedbackViewed
									? feedbackClass || ''
									: isSelected(option.id)
										? 'bg-primary text-muted *:border-muted *:text-muted'
										: ''
							} ${isLocked ? 'cursor-not-allowed' : ''}`}
						>
							<span>{option.key}. {option.value}</span>
							<div class="float-end flex items-center gap-1">
								{#if feedbackStatus === 'correct'}
									<span class="text-xs font-medium text-green-600">{$t('Correct')}</span>
									<Check size={18} class="text-green-600" />
								{:else if feedbackStatus === 'wrong'}
									<span class="text-xs font-medium text-red-600">{$t('Wrong')}</span>
									<X size={18} class="text-red-600" />
								{:else}
									<RadioGroup.Item value={option.id.toString()} id={uid} disabled={isLocked} />
								{/if}
							</div>
						</Label>
					{/each}
				</RadioGroup.Root>
			{/key}
		{:else if question.question_type === 'subjective'}
			<div class="flex flex-col gap-2">
				<textarea
					class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-30 w-full rounded-xl border px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					placeholder={$t('Type your answer here...')}
					bind:value={subjectiveText}
					maxlength={question.subjective_answer_limit || undefined}
				></textarea>
				<div class="flex items-center justify-between">
					<Button
						variant="default"
						size="sm"
						onclick={handleSubjectiveSubmit}
						disabled={isSubmitting || !subjectiveText.trim() || !hasUnsavedChanges}
					>
						{#if !hasUnsavedChanges && hasSavedBefore}
							<Check class="mr-1 h-4 w-4" />
							{$t('Saved')}
						{:else if hasSavedBefore}
							{$t('Update Answer')}
						{:else}
							{$t('Save Answer')}
						{/if}
					</Button>
					{#if question.subjective_answer_limit}
						{@const remaining = question.subjective_answer_limit - subjectiveText.length}
						<div class="flex flex-col">
							<span
								class="text-sm {remaining <= 0
									? 'font-medium text-red-500'
									: 'text-muted-foreground'}"
							>
								{remaining}
								{$t('characters remaining')}
							</span>
							{#if remaining <= 0}
								<span class="text-xs text-red-500">
									{$t('Character limit reached')}
								</span>
							{/if}
						</div>
					{:else}
						<span></span>
					{/if}
				</div>
			</div>
		{:else}
			{#each options as option (option.id)}
				{@const uid = `${question.id}-${option.key}`}
				{@const feedbackClass = optionFeedbackClass(option.id)}
				{@const feedbackStatus = getOptionFeedbackStatus(option.id)}
				<div class="flex flex-row items-start space-x-3">
					<Label
						for={uid}
						class={`mb-2 w-full cursor-pointer rounded-xl border px-4 py-5 ${
							isFeedbackViewed
								? feedbackClass || ''
								: isSelected(option.id)
									? 'bg-primary text-muted *:border-muted *:text-muted'
									: ''
						} ${isLocked ? 'cursor-not-allowed' : ''}`}
					>
						<span>{option.key}. {option.value}</span>
						<div class="float-end flex items-center gap-1">
							{#if feedbackStatus === 'correct'}
								<span class="text-xs font-medium text-green-600">{$t('Correct')}</span>
								<Check size={18} class="text-green-600" />
							{:else if feedbackStatus === 'wrong'}
								<span class="text-xs font-medium text-red-600">{$t('Wrong')}</span>
								<X size={18} class="text-red-600" />
							{:else}
								<Checkbox
									id={uid}
									value={option.id.toString()}
									checked={isSelected(option.id)}
									disabled={isLocked}
									onCheckedChange={async (check) => {
										await handleSelection(question.id, option.id, check === false);
									}}
								/>
							{/if}
						</div>
					</Label>
				</div>
			{/each}
		{/if}

		{#if showFeedback && hasFeedbackAvailable && !isFeedbackViewed && question.question_type !== 'subjective'}
			<Button
				variant="outline"
				class="mt-4 w-full border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
				onclick={confirmViewFeedback}
			>
				{$t('View Feedback')}
			</Button>
		{/if}

		<Button
			variant="outline"
			class="mt-4 w-full {isQuestionBookmarked
				? 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'
				: ''}"
			onclick={handleBookmark}
			disabled={isLocked}
		>
			<Bookmark class="mr-2 h-4 w-4 {isQuestionBookmarked ? 'fill-amber-500' : ''}" />
			{isQuestionBookmarked ? $t('Unmark for review') : $t('Mark for review')}
		</Button>
	</Card.Content>
</Card.Root>
