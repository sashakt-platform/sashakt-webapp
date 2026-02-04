<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from 'svelte-i18n';
	import type { TResultData, TFeedback } from '$lib/types';

	let {
		resultData,
		testDetails,
		feedback = null,
		onViewFeedback = () => {}
	}: {
		resultData: TResultData;
		testDetails: { name: string; link: string; completion_message?: string; show_feedback_on_completion?: boolean };
		feedback?: TFeedback[] | null;
		onViewFeedback?: () => void;
	} = $props();

	const totalQuestions = resultData?.total_questions || 0;

	const attempted = resultData
		? (resultData.correct_answer || 0) + (resultData.incorrect_answer || 0)
		: 0;
	const notAttempted = totalQuestions - attempted;

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
			a.download = `certificate-${testDetails.name.replace(/\s+/g, '-')}.pdf`;
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

<section class="mx-auto mt-2 w-xs text-center">
	<img src="/circle-check.svg" alt="done" class="mx-auto mb-5 w-20" />
	<h6 class="text-accent-foreground mb-2 text-[10px] font-semibold uppercase">
		{testDetails.name}
	</h6>
	<h3 class="mb-1 text-lg font-semibold">{$t('Submitted Successfully')}</h3>
	<p class="text-sm/normal [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800">
		{#if testDetails.completion_message}
			{@html testDetails.completion_message}
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
	</p>
	{#if resultData}
		<p class="text-accent-foreground mt-4 border-b py-2 text-sm font-bold uppercase">
			{$t('Result summary')}
		</p>

		<Table.Root class="bg-accent mt-4 rounded-xl">
			<Table.Body>
				<Table.Row>
					<Table.Cell class="border-r">{$t('Correct Answers')}</Table.Cell>
					<Table.Cell>{resultData.correct_answer}</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell class="border-r">{$t('Incorrect Answers')}</Table.Cell>
					<Table.Cell>{resultData.incorrect_answer}</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell class="border-r">{$t('Not Attempted')}</Table.Cell>
					<Table.Cell>{notAttempted}</Table.Cell>
				</Table.Row>
				{#if resultData.marks_obtained !== null && resultData.marks_maximum !== null}
					<Table.Row class="font-semibold">
						<Table.Cell class="border-r">{$t('Total marks obtained')}</Table.Cell>
						<Table.Cell>{resultData.marks_obtained} / {resultData.marks_maximum}</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>

		{#if resultData.certificate_download_url}
			<div class="mt-6">
				{#if downloadError}
					<p class="text-destructive mb-2 text-sm">{downloadError}</p>
				{/if}
				<Button onclick={handleDownloadCertificate} disabled={isDownloading} class="w-full">
					{isDownloading ? $t('Downloading...') : $t('Download Certificate')}
				</Button>
			</div>
		{/if}
	{/if}
	{#if testDetails.show_feedback_on_completion && feedback}
		<Button class="mt-8" onclick={onViewFeedback}>View Feedback</Button>
	{/if}
</section>
