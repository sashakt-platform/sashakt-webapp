<script lang="ts">
	import ViewFeedback from '$lib/components/ViewFeedback.svelte';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import { DynamicForm } from '$lib/components/form';
	import Question from '$lib/components/Question.svelte';
	import OmrSheet from '$lib/components/OmrSheet.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import type { PageProps } from './$types';
	import { locale } from 'svelte-i18n';
	import { t } from 'svelte-i18n';
	import { DEFAULT_LANGUAGE } from '$lib/utils';
	import CandidateProfile from '$lib/components/CandidateProfile.svelte';

	let { data, form }: PageProps = $props();

	let showFeedbackView = $state(false);
	let showProfileForm = $state(false);

	let showOmrChoice = $state(false);
	let candidateFormResponses = $state<Record<string, unknown>>({});

	$effect(() => {
		const currentLocale = data?.testData?.locale || DEFAULT_LANGUAGE;
		locale.set(currentLocale);
	});

	const hasDynamicForm = $derived(!!data.testData?.form);
	const hasOmrChoice = $derived(data.testData?.omr === 'OPTIONAL');

	$effect(() => {
		form;
		showFeedbackView = false;
	});

	function handleViewFeedback() {
		showFeedbackView = true;
	}

	function handleBackToResults() {
		showFeedbackView = false;
	}

	function handleFormContinue(formResponses: Record<string, unknown>) {
		candidateFormResponses = formResponses;
		showOmrChoice = true;
	}
</script>

<section>
	{#if showFeedbackView && form?.feedback}
		<ViewFeedback
			feedback={form.feedback}
			testQuestions={form.testQuestions}
			onBack={handleBackToResults}
		/>
	{:else if data.candidate === undefined}
		<p>{$t('Loading...')}</p>
	{:else if form?.submitTest}
		<TestResult
			resultData={form.result}
			testDetails={data.testData}
			feedback={form.feedback}
			onViewFeedback={handleViewFeedback}
		/>
	{:else if !data.candidate && !showProfileForm}
		<LandingPage testDetails={data.testData} bind:showProfileForm />
	{:else if !data.candidate && hasDynamicForm && !showOmrChoice}
		<DynamicForm
			form={data.testData.form}
			testDetails={data.testData}
			locations={data.locations || {}}
			onContinue={hasOmrChoice ? handleFormContinue : undefined}
		/>
	{:else if !data.candidate && hasOmrChoice}
		<CandidateProfile testDetails={data.testData} formResponses={candidateFormResponses} />
	{:else if data.testQuestions?.question_revisions}
		{#if data.candidate.use_omr === 'true' || data.testData?.omr === 'ALWAYS'}
			<OmrSheet
				candidate={data.candidate}
				testDetails={data.testData}
				testQuestions={data.testQuestions}
			/>
		{:else}
			<Question
				testQuestions={data.testQuestions}
				candidate={data.candidate}
				testDetails={data.testData}
			/>
		{/if}
	{:else if data.testQuestions === null && data.timeLeft == 0}
		<p>{$t('Sorry, you have exceeded the time limit for this test.')}</p>
	{:else}
		<p>{$t('Loading test questions...')}</p>
	{/if}
</section>
