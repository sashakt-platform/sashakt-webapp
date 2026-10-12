<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { t } from 'svelte-i18n';
	import type { TResultData, TFeedback } from '$lib/types';
	import { CircleCheck, CircleX, CircleMinus, CircleDashed } from '@lucide/svelte';
	import RichText from './RichText.svelte';

	let {
		resultData,
		testDetails,
		feedback = null,
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
		onViewFeedback?: () => void;
	} = $props();

	const notAttempted = $derived(
		(resultData?.mandatory_not_attempted ?? 0) + (resultData?.optional_not_attempted ?? 0)
	);
	const partiallyCorrect = $derived(resultData?.partially_correct ?? 0);
	const sections = $derived(resultData?.sections ?? []);

	// Hide a column no section can fill, rather than a row of dashes.
	const anySectionHasMarks = $derived(sections.some((s) => s.marks_maximum !== null));
	const anySectionHasPartial = $derived(sections.some((s) => s.partially_correct > 0));

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

				<!-- Only shown when partial credit was actually earned, so tests that
				     cannot earn it keep the three familiar rows. -->
				{#if partiallyCorrect > 0}
					<div class="flex items-center justify-between py-4">
						<div class="flex items-center gap-3">
							<CircleDashed class="text-warning h-5 w-5" />
							<span class="text-foreground text-sm">{$t('Partially Correct')}</span>
						</div>
						<span class="text-foreground text-sm font-semibold">{pad(partiallyCorrect)}</span>
					</div>
				{/if}

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

	{#if sections.length > 0}
		<div class="w-full max-w-4xl">
			<h3 class="text-muted-foreground mb-4 text-xs font-bold tracking-wider uppercase">
				{$t('Section summary')}
			</h3>
			<!-- A table rather than cards: a paper can carry nine or more sections,
			     and cards stop being comparable well before that. Scrolls inside its
			     own container so the page never scrolls sideways. -->
			<div class="bg-card overflow-x-auto rounded-2xl border shadow-sm">
				<table class="w-full text-sm">
					<thead class="bg-section-header">
						<tr class="text-muted-foreground text-left text-xs font-semibold uppercase">
							<th class="w-full px-4 py-3 font-semibold">{$t('Section')}</th>
							{#if anySectionHasMarks}
								<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Marks')}</th>
							{/if}
							<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Questions')}</th>
							<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Attempted')}</th>
							<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Correct')}</th>
							{#if anySectionHasPartial}
								<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Partially Correct')}</th>
							{/if}
							<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Incorrect')}</th>
							<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Attempt Rate')}</th>
							<th class="py-3 pr-4 pl-2 text-right font-semibold">{$t('Accuracy')}</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each sections as section (section.question_set_id)}
							<tr>
								<td class="text-card-foreground px-4 py-3 font-medium">{section.title}</td>
								{#if anySectionHasMarks}
									<td class="text-foreground py-3 pr-4 pl-2 text-right font-semibold">
										{section.marks_obtained === null || section.marks_maximum === null
											? '--'
											: `${section.marks_obtained}/${section.marks_maximum}`}
									</td>
								{/if}
								<td class="text-foreground py-3 pr-4 pl-2 text-right">{section.total_questions}</td>
								<td class="text-foreground py-3 pr-4 pl-2 text-right">{section.attempted}</td>
								<td class="text-foreground py-3 pr-4 pl-2 text-right">{section.correct_answer}</td>
								{#if anySectionHasPartial}
									<td class="text-foreground py-3 pr-4 pl-2 text-right">
										{section.partially_correct}
									</td>
								{/if}
								<td class="text-foreground py-3 pr-4 pl-2 text-right">{section.incorrect_answer}</td
								>
								<td class="text-muted-foreground py-3 pr-4 pl-2 text-right">
									{section.attempt_rate}%
								</td>
								<td class="text-muted-foreground py-3 pr-4 pl-2 text-right">
									{section.attempted === 0 ? '--' : `${section.accuracy}%`}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>
