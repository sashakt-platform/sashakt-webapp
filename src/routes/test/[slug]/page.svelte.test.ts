import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';
import {
	mockCandidate,
	mockTestData,
	mockQuestions,
	mockResultData,
	mockTestQuestionsResponse
} from '$lib/test-utils';

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

describe('Test Page - Feedback flow', () => {
	const mockFeedback = [
		{
			question_revision_id: 1,
			submitted_answer: [101],
			correct_answer: [102]
		}
	];

	const testDataWithFeedback = {
		...mockTestData,
		completion_message: null,
		show_feedback_on_completion: true
	};

	const baseData = {
		testData: testDataWithFeedback,
		timeToBegin: 300
	};

	it('should show View Feedback button when feedback is available and setting is on', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: null
				},
				form: {
					submitTest: true,
					result: mockResultData,
					feedback: mockFeedback,
					testQuestions: mockTestQuestionsResponse
				}
			}
		});

		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
		expect(screen.getByText('View Result')).toBeInTheDocument();
	});

	it('should NOT show View Feedback button when show_feedback_on_completion is false', () => {
		const testDataNoFeedback = { ...testDataWithFeedback, show_feedback_on_completion: false };

		render(Page, {
			props: {
				data: {
					testData: testDataNoFeedback,
					timeToBegin: 300,
					candidate: mockCandidate,
					testQuestions: null
				},
				form: {
					submitTest: true,
					result: mockResultData,
					feedback: mockFeedback,
					testQuestions: mockTestQuestionsResponse
				}
			}
		});

		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
		expect(screen.queryByText('View Result')).not.toBeInTheDocument();
	});

	it('should NOT show View Feedback button when feedback is null', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: null
				},
				form: {
					submitTest: true,
					result: mockResultData,
					feedback: null,
					testQuestions: null
				}
			}
		});

		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
		expect(screen.queryByText('View Result')).not.toBeInTheDocument();
	});

	it('should switch to ViewFeedback when View Feedback button is clicked', async () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					testQuestions: null
				},
				form: {
					submitTest: true,
					result: mockResultData,
					feedback: mockFeedback,
					testQuestions: mockTestQuestionsResponse
				}
			}
		});

		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();

		const button = screen.getByText('View Result');
		await fireEvent.click(button);

		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});

		expect(screen.queryByText('Submitted Successfully')).not.toBeInTheDocument();
	});
});
