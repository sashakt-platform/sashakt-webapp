import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';
import { mockCandidate, mockTestData, mockQuestions, mockResultData } from '$lib/test-utils';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: {
		form: null,
		data: {
			testData: {
				start_time: new Date().toISOString()
			}
		}
	}
}));

// Mock fetch for API calls
vi.stubGlobal('fetch', vi.fn());

describe('Test Page', () => {
	const testDataWithNoCompletion = { ...mockTestData, completion_message: null };

	const baseData = {
		testData: testDataWithNoCompletion,
		timeToBegin: 300,
		locations: null
	};

	it('should show loading when candidate is undefined', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: undefined,
					testQuestions: null
				},
				form: null
			}
		});

		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('should render TestResult when form has submitTest', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: null
				},
				form: {
					submitTest: true,
					result: mockResultData
				}
			}
		});

		// TestResult shows "Submitted Successfully"
		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
		// Also shows "Result summary"
		expect(screen.getByText('Result summary')).toBeInTheDocument();
	});

	it('should render LandingPage when no candidate', async () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: null,
					testQuestions: null
				},
				form: null
			}
		});

		// LandingPage should be rendered - check for test name
		expect(screen.getByText(mockTestData.name)).toBeInTheDocument();
	});

	it('should render Question component when candidate has test questions', async () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: {
						question_revisions: mockQuestions,
						question_pagination: 5
					}
				},
				form: null
			}
		});

		// Wait for Question component to render
		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});
	});

	it('should show time exceeded message when time is 0', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: null,
					timeLeft: 0
				},
				form: null
			}
		});

		expect(screen.getByText(/exceeded the time limit/i)).toBeInTheDocument();
	});

	it('should show loading test questions message when waiting', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: null,
					timeLeft: 100
				},
				form: null
			}
		});

		expect(screen.getByText('Loading test questions...')).toBeInTheDocument();
	});
});
