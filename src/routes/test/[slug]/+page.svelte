<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import CandidateProfile from '$lib/components/CandidateProfile.svelte';
	import Question from '$lib/components/Question.svelte';
	import OmrSheet from '$lib/components/OmrSheet.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import type { PageProps } from './$types';
	import { locale } from 'svelte-i18n';
	import { t } from 'svelte-i18n';
	import { DEFAULT_LANGUAGE } from '$lib/utils';

	let { data, form }: PageProps = $props();
	let showProfileForm = $state(false);

	$effect(() => {
		const currentLocale = data?.testData?.locale || DEFAULT_LANGUAGE;
		locale.set(currentLocale);
	});
</script>

<section>
	{#if data.candidate === undefined}
		<!-- Show nothing or a loading spinner while candidate is loading -->
		<p>{$t('Loading...')}</p>
	{:else if form?.submitTest}
		<TestResult resultData={form.result} testDetails={data.testData} />
	{:else if !data.candidate && !showProfileForm}
		<LandingPage testDetails={data.testData} bind:showProfileForm />
	{:else if !data.candidate && showProfileForm}
		<CandidateProfile testDetails={data.testData} />
	{:else if data.testQuestions?.question_revisions}
		{#if data.candidate.use_omr === 'true'}
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
