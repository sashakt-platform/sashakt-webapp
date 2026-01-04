<script lang="ts">
	import LandingPage from '$lib/components/LandingPage.svelte';
	import CandidateProfile from '$lib/components/CandidateProfile.svelte';
	import Question from '$lib/components/Question.svelte';
	import TestResult from '$lib/components/TestResult.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let showProfileForm = $state(false);
</script>

<section>
	{#if data.candidate === undefined}
		<!-- Show nothing or a loading spinner while candidate is loading -->
		<p>Loading...</p>
	{:else if form?.submitTest}
		<TestResult resultData={form.result} testDetails={data.testData} />
	{:else if !data.candidate && !showProfileForm}
		<LandingPage testDetails={data.testData} bind:showProfileForm />
	{:else if !data.candidate && showProfileForm && data.testData.candidate_profile}
		<CandidateProfile testDetails={data.testData} />
	{:else if data.testQuestions?.question_revisions}
		<Question
			testQuestions={data.testQuestions}
			candidate={data.candidate}
			testDetails={data.testData}
		/>
	{:else if data.testQuestions === null && data.timeLeft == 0}
		<p>Sorry, you have exceeded the time limit for this test.</p>
	{:else}
		<p>Loading test questions...</p>
	{/if}
</section>
