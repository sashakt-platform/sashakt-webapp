<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import {
		buildQuestionSetGroups,
		getQuestionSetQuestionCount,
		normalizeTestQuestions
	} from '$lib/helpers/questionSetHelpers';
	import { getQuestionResult } from '$lib/helpers/feedbackHelpers';
	import { t } from 'svelte-i18n';
	import type { TResultData, TFeedback, TTestQuestionsResponse } from '$lib/types';
	import { CircleCheck, CircleX, CircleMinus } from '@lucide/svelte';
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

	const totalQuestions = resultData?.total_questions ?? 0;
	const attempted = resultData
		? (resultData.correct_answer ?? 0) + (resultData.incorrect_answer ?? 0)
		: 0;
	const notAttempted = totalQuestions - attempted;
	const normalizedTestQuestions = $derived(normalizeTestQuestions(testQuestions));
	const feedbackByQuestionId = $derived(
		new Map((feedback ?? []).map((entry) => [entry.question_revision_id, entry]))
	);
	/**
	 * Classify a question's answer using the same helper the per-question badges
	 * use, so the section tallies cannot drift from what the candidate is shown.
	 */
	const resultFor = (question: (typeof normalizedTestQuestions.questions)[number]) => {
		const entry = feedbackByQuestionId.get(question.id);
		if (!entry) return 'unattempted';
		return getQuestionResult(
			question.question_type,
			entry.submitted_answer,
			entry.correct_answer,
			question.marking_scheme
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
			const results = group.questions.map((question) => resultFor(question));
			const correctCount = results.filter((r) => r === 'correct').length;
			const partialCount = results.filter((r) => r === 'partially-correct').length;

			return {
				title: group.section.title,
				questionCount: getQuestionSetQuestionCount(group.section),
				attemptedCount,
				correctCount,
				partialCount,
				allowedCount: group.section.max_questions_allowed_to_attempt,
				// Partial credit counts as credited (the backend tallies it under
				// `correct`), so accuracy must include it or a section scored entirely
				// on partial credit reads as 0%.
				accuracy:
					attemptedCount > 0
						? Math.round(((correctCount + partialCount) / attemptedCount) * 100)
						: null
			};
		})
	);

	let isDownloading = $state(false);
	let downloadError = $state<string | null>(null);

	function pad(n: number) {
		return n === 0 ? '0' : String(n).padStart(2, '0');
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

<section class="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
	<div class="bg-card w-full max-w-sm overflow-hidden rounded-2xl shadow-sm">
		<div class="bg-secondary flex flex-col items-center px-6 py-8 text-center">
			<h2 class="text-foreground mb-1 text-lg font-bold">
				"{testDetails.name}" {$t('Submitted')}
			</h2>
			{#if resultData?.external_identifier}
				<p class="text-muted-foreground mb-1 text-sm">
					{$t('User ID')}: {resultData.external_identifier}
				</p>
			{/if}
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
					<Button
						variant="outline"
						class="border-primary text-primary hover:bg-primary/10 hover:text-primary w-full"
						onclick={onViewFeedback}
					>
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
		{/if}
	</div>

	{#if sectionSummaries.length > 0}
		<div class="w-2/3">
			<h3 class="text-muted-foreground mb-4 text-xs font-bold tracking-wider uppercase">
				{$t('Section summary')}
			</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each sectionSummaries as section (`${section.title}-${section.questionCount}`)}
					<div class="bg-card w-full rounded-2xl border p-5 shadow-sm">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p class="text-card-foreground text-base font-semibold">{section.title}</p>
								<p class="text-muted-foreground mt-1 text-sm">
									{$t('Allowed')}: {section.allowedCount}
								</p>
							</div>
							<div
								class="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm font-medium"
							>
								{#if section.accuracy === null}
									{$t('Accuracy')}: --
								{:else}
									{$t('Accuracy')}: {section.accuracy}%
								{/if}
							</div>
						</div>

						<div
							class="mt-4 grid grid-cols-2 gap-3 {section.partialCount > 0
								? 'sm:grid-cols-2'
								: 'sm:grid-cols-3'}"
						>
							<div class="bg-muted rounded-xl p-3">
								<p class="text-muted-foreground text-xs font-semibold uppercase">
									{$t('Questions')}
								</p>
								<p class="text-foreground mt-1 text-xl font-semibold">{section.questionCount}</p>
							</div>
							<div class="bg-muted rounded-xl p-3">
								<p class="text-muted-foreground text-xs font-semibold uppercase">
									{$t('Attempted')}
								</p>
								<p class="text-foreground mt-1 text-xl font-semibold">{section.attemptedCount}</p>
							</div>
							<div
								class="bg-muted rounded-xl p-3 {section.partialCount > 0
									? ''
									: 'col-span-2 sm:col-span-1'}"
							>
								<p class="text-muted-foreground text-xs font-semibold uppercase">
									{$t('Correct')}
								</p>
								<p class="text-foreground mt-1 text-xl font-semibold">{section.correctCount}</p>
							</div>
							<!-- Only shown where the section awards partial credit, so sections
							     that cannot earn it are not given an always-zero tile. -->
							{#if section.partialCount > 0}
								<div class="bg-muted rounded-xl p-3">
									<p class="text-muted-foreground text-xs font-semibold uppercase">
										{$t('Partially Correct')}
									</p>
									<p class="text-foreground mt-1 text-xl font-semibold">{section.partialCount}</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
