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
	import { CircleCheck, CircleX, CircleMinus } from '@lucide/svelte';

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

	const totalQuestions = resultData?.total_questions ?? 0;
	const attempted = resultData
		? (resultData.correct_answer ?? 0) + (resultData.incorrect_answer ?? 0)
		: 0;
	const notAttempted = totalQuestions - attempted;
	const normalizedTestQuestions = $derived(normalizeTestQuestions(testQuestions));
	const feedbackByQuestionId = $derived(
		new Map((feedback ?? []).map((entry) => [entry.question_revision_id, entry]))
	);
	const isFeedbackEntryCorrect = (
		question: (typeof normalizedTestQuestions.questions)[number]
	): boolean => {
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
			const correctCount = group.questions.filter((question) =>
				isFeedbackEntryCorrect(question)
			).length;

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

	function pad(n: number) {
		return String(n).padStart(2, '0');
	}

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

<section class="bg-background flex min-h-screen items-center justify-center px-4 py-10">
	<div class="w-full max-w-sm overflow-hidden rounded-2xl shadow-sm">
		<div class="bg-secondary flex flex-col items-center px-6 py-8 text-center">
			<h2 class="text-foreground mb-1 text-lg font-bold">
				"{testDetails.name}" {$t('Submitted')}
			</h2>
			<p class="text-muted-foreground mb-4 text-sm">
				{#if testDetails.completion_message}
					<RichText content={testDetails.completion_message} class="text-left" />
				{/if}
			</p>
			{#if resultData && resultData.marks_obtained !== null && resultData.marks_maximum !== null}
				<p class="text-primary text-4xl font-bold">
					{resultData.marks_obtained}/{resultData.marks_maximum}
				</p>
				<p class="text-primary mt-1 text-sm font-medium">{$t('Your Score')}</p>
			{/if}
		</div>

		{#if resultData}
			<div class="divide-border divide-y px-6">
				<div class="flex items-center justify-between py-4">
					<div class="flex items-center gap-3">
						<CircleCheck class="text-success h-5 w-5" />
						<span class="text-foreground text-sm">{$t('Correct')}</span>
					</div>
					<span class="text-foreground text-sm font-semibold">{pad(resultData.correct_answer)}</span
					>
				</div>

				<div class="flex items-center justify-between py-4">
					<div class="flex items-center gap-3">
						<CircleX class="text-error h-5 w-5" />
						<span class="text-foreground text-sm">{$t('Incorrect')}</span>
					</div>
					<span class="text-foreground text-sm font-semibold"
						>{pad(resultData.incorrect_answer)}</span
					>
				</div>

				<div class="flex items-center justify-between py-4">
					<div class="flex items-center gap-3">
						<CircleMinus class="text-muted-foreground h-5 w-5" />
						<span class="text-foreground text-sm">{$t('Unanswered')}</span>
					</div>
					<span class="text-foreground text-sm font-semibold">{pad(notAttempted)}</span>
				</div>
			</div>

			<div class="space-y-3 px-6 pt-2 pb-6">
				{#if downloadError}
					<p class="text-destructive text-sm">{downloadError}</p>
				{/if}

				{#if testDetails.show_feedback_on_completion && feedback}
					<Button variant="outline" class="w-full" onclick={onViewFeedback}>
						{$t('View All Answers')}
					</Button>
				{/if}

				{#if resultData.certificate_download_url}
					<Button onclick={handleDownloadCertificate} disabled={isDownloading} class="w-full">
						{#if isDownloading}
							<Spinner />
						{/if}
						{isDownloading ? $t('Preparing...') : $t('Download Certificate')}
					</Button>
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
									<p class="text-muted-foreground text-xs font-semibold uppercase">
										{$t('Correct')}
									</p>
									<p class="mt-1 text-xl font-semibold text-slate-900">{section.correctCount}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</section>
