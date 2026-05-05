<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { t } from 'svelte-i18n';
	import type { TResultData, TFeedback } from '$lib/types';
	import { CircleCheck, CircleX, CircleMinus } from '@lucide/svelte';

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
			completion_message?: string;
			show_feedback_on_completion?: boolean;
		};
		feedback?: TFeedback[] | null;
		onViewFeedback?: () => void;
	} = $props();

	const totalQuestions = resultData?.total_questions ?? 0;
	const attempted = resultData
		? (resultData.correct_answer ?? 0) + (resultData.incorrect_answer ?? 0)
		: 0;
	const notAttempted = totalQuestions - attempted;

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

<section class="bg-muted flex min-h-screen items-center justify-center px-4 py-10">
	<div class="bg-card w-full max-w-sm overflow-hidden rounded-2xl shadow-sm">
		<div class="bg-secondary flex flex-col items-center px-6 py-8 text-center">
			<h2 class="text-foreground mb-1 text-lg font-bold">
				"{testDetails.name}" {$t('Submitted')}
			</h2>
			<p class="text-muted-foreground mb-4 text-sm">
				{#if testDetails.completion_message}
					{@html testDetails.completion_message}
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
					<Button variant="outline" class="w-full border-primary text-primary hover:bg-primary/10 hover:text-primary" onclick={onViewFeedback}>
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
</section>
