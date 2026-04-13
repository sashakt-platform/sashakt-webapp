<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import {
		buildQuestionSetGroups,
		getQuestionSetQuestionCount,
		normalizeTestQuestions
	} from '$lib/helpers/questionSetHelpers';
	import { isNumericalAnswerCorrect } from '$lib/helpers/feedbackHelpers';
	import { t } from 'svelte-i18n';
	import type { TResultData, TFeedback, TTestQuestionsResponse } from '$lib/types';
	import RichText from './RichText.svelte';

	let {
		resultData,
		testDetails,
		feedback = null,
		testQuestions = null,
		onViewFeedback = () => {}
	}: {
		resultData: TResultData | null;
		testDetails: {
			name: string;
			link: string;
			completion_message?: string | null;
			show_feedback_on_completion?: boolean;
		};
		feedback?: TFeedback[] | null;
		testQuestions?: TTestQuestionsResponse | null;
		onViewFeedback?: () => void;
	} = $props();

	const totalQuestions = resultData?.total_questions || 0;

	const attempted = resultData
		? (resultData.correct_answer || 0) + (resultData.incorrect_answer || 0)
		: 0;
	const notAttempted = totalQuestions - attempted;
	const normalizedTestQuestions = $derived(normalizeTestQuestions(testQuestions));
	const feedbackByQuestionId = $derived(
		new Map((feedback ?? []).map((entry) => [entry.question_revision_id, entry]))
	);
	const isFeedbackEntryCorrect = (question: (typeof normalizedTestQuestions.questions)[number]): boolean => {
		const entry = feedbackByQuestionId.get(question.id);
		if (!entry) return false;
		if (typeof entry.correct_answer === 'number') {
			if (typeof entry.submitted_answer !== 'string') {
				return false;
			}
			return (
				isNumericalAnswerCorrect(
					question.question_type,
					entry.submitted_answer,
					entry.correct_answer
				) === true
			);
		}
		if (!Array.isArray(entry.submitted_answer) || !Array.isArray(entry.correct_answer)) {
			return false;
		}
		const submittedAnswer = entry.submitted_answer;
		const correctAnswer = entry.correct_answer;
		return (
			submittedAnswer.length === correctAnswer.length &&
			submittedAnswer.every((answer) => correctAnswer.includes(answer))
		);
	};
	const sectionSummaries = $derived(
		buildQuestionSetGroups(
			normalizedTestQuestions.questions,
			normalizedTestQuestions.questionSets
		).map((group) => {
			const attemptedCount = group.questions.filter((question) => {
				const entry = feedbackByQuestionId.get(question.id);
				if (!entry) return false;
				if (typeof entry.submitted_answer === 'string') {
					return entry.submitted_answer.trim().length > 0;
				}
				return entry.submitted_answer.length > 0;
			}).length;
			const correctCount = group.questions.filter((question) => isFeedbackEntryCorrect(question)).length;

			return {
				title: group.section.title,
				questionCount: getQuestionSetQuestionCount(group.section),
				attemptedCount,
				correctCount,
				allowedCount: group.section.max_questions_allowed_to_attempt,
				accuracy: attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : null
			};
		})
	);

	let isDownloading = $state(false);
	let downloadError = $state<string | null>(null);

	async function handleDownloadCertificate() {
		if (!resultData?.certificate_download_url) return;

		isDownloading = true;
		downloadError = null;

		try {
			const response = await fetch('/api/download-certificate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					certificate_download_url: resultData.certificate_download_url
				})
			});

			if (!response.ok) {
				throw new Error('Download failed');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `certificate-${testDetails.name.replace(/\s+/g, '-')}.png`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch {
			downloadError = $t('Failed to download certificate. Please try again.');
		} finally {
			isDownloading = false;
		}
	}
</script>

<section class="mx-auto mt-2 max-w-3xl px-4 text-center">
	<img src="/circle-check.svg" alt="done" class="mx-auto mb-5 w-20" />
	<h6 class="text-accent-foreground mb-2 text-[10px] font-semibold uppercase">
		{testDetails.name}
	</h6>
	<h3 class="mb-1 text-lg font-semibold">{$t('Submitted Successfully')}</h3>
	<div class="text-sm/normal [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800">
		{#if testDetails.completion_message}
			<RichText content={testDetails.completion_message} class="text-left" />
		{:else}
			{$t('Congrats on completing the test!')}
			{#if resultData}
				{$t('You have attempted {count} questions.', {
					values: { count: attempted }
				})}
			{:else}
				{$t('Your test has been submitted successfully.')}
			{/if}
		{/if}
	</div>
	{#if resultData}
		<p class="text-accent-foreground mt-4 border-b py-2 text-sm font-bold uppercase">
			{$t('Result summary')}
		</p>

		<div class="mt-4 grid gap-3 text-left sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-2xl border bg-white p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-semibold uppercase">{$t('Correct Answers')}</p>
				<p class="mt-2 text-2xl font-semibold text-slate-900">{resultData.correct_answer}</p>
			</div>
			<div class="rounded-2xl border bg-white p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-semibold uppercase">
					{$t('Incorrect Answers')}
				</p>
				<p class="mt-2 text-2xl font-semibold text-slate-900">{resultData.incorrect_answer}</p>
			</div>
			<div class="rounded-2xl border bg-white p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-semibold uppercase">{$t('Not Attempted')}</p>
				<p class="mt-2 text-2xl font-semibold text-slate-900">{notAttempted}</p>
			</div>
			{#if resultData.marks_obtained !== null && resultData.marks_maximum !== null}
				<div class="rounded-2xl border bg-white p-4 shadow-sm">
					<p class="text-muted-foreground text-xs font-semibold uppercase">
						{$t('Total marks obtained')}
					</p>
					<p class="mt-2 text-2xl font-semibold text-slate-900">
						{resultData.marks_obtained}
						<span class="text-base font-medium text-slate-500">/ {resultData.marks_maximum}</span>
					</p>
				</div>
			{/if}
		</div>

		{#if sectionSummaries.length > 0}
			<p class="text-accent-foreground mt-6 border-b py-2 text-sm font-bold uppercase">
				{$t('Section summary')}
			</p>

			<div class="mt-4 grid gap-4 text-left md:grid-cols-2">
				{#each sectionSummaries as section (`${section.title}-${section.questionCount}`)}
					<div class="rounded-2xl border bg-white p-5 shadow-sm">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-base font-semibold text-slate-900">{section.title}</p>
								<p class="text-muted-foreground mt-1 text-sm">
									{$t('Allowed')}: {section.allowedCount}
								</p>
							</div>
							<div class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
								{#if section.accuracy === null}
									{$t('Accuracy')}: --
								{:else}
									{$t('Accuracy')}: {section.accuracy}%
								{/if}
							</div>
						</div>

						<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
							<div class="rounded-xl bg-slate-50 p-3">
								<p class="text-muted-foreground text-xs font-semibold uppercase">
									{$t('Questions')}
								</p>
								<p class="mt-1 text-xl font-semibold text-slate-900">{section.questionCount}</p>
							</div>
							<div class="rounded-xl bg-slate-50 p-3">
								<p class="text-muted-foreground text-xs font-semibold uppercase">
									{$t('Attempted')}
								</p>
								<p class="mt-1 text-xl font-semibold text-slate-900">{section.attemptedCount}</p>
							</div>
							<div class="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1">
								<p class="text-muted-foreground text-xs font-semibold uppercase">{$t('Correct')}</p>
								<p class="mt-1 text-xl font-semibold text-slate-900">{section.correctCount}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if resultData.certificate_download_url}
			<div class="mt-6">
				{#if downloadError}
					<p class="text-destructive mb-2 text-sm">{downloadError}</p>
				{/if}
				<Button onclick={handleDownloadCertificate} disabled={isDownloading} class="w-full">
					{#if isDownloading}
						<Spinner />
					{/if}
					{isDownloading ? $t('Preparing...') : $t('Download Certificate')}
				</Button>
			</div>
		{/if}
	{/if}
	{#if testDetails.show_feedback_on_completion && feedback}
		<Button class="mt-8" onclick={onViewFeedback}>{$t('View Feedback')}</Button>
	{/if}
</section>
