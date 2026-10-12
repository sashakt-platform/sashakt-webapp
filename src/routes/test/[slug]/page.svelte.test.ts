import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';
import {
	mockCandidate,
	mockTestData,
	mockQuestions,
	mockResultData,
	mockTestQuestionsResponse
} from '$lib/test-utils';
import { navState } from '$lib/navState.svelte';

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
		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
		// Also shows "Result summary"
	});

	it('should render TestResult on refresh when data is submitted', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					submitted: true,
					result: mockResultData,
					testQuestions: null
				},
				form: null
			}
		});

		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
	});

	it('should show already-submitted message when submitted without a result', () => {
		render(Page, {
			props: {
				data: {
					...baseData,
					candidate: mockCandidate,
					submitted: true,
					result: null,
					testQuestions: null
				},
				form: null
			}
		});

		expect(screen.getByText('You have already submitted this test.')).toBeInTheDocument();
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

describe('Test Page - OMR Mode display', () => {
	const testQuestions = {
		question_revisions: mockQuestions,
		question_pagination: 5
	};

	it('should render OmrSheet when omr mode is ALWAYS', async () => {
		const testDataAlways = { ...mockTestData, completion_message: null, omr: 'ALWAYS' };

		render(Page, {
			props: {
				data: {
					testData: testDataAlways,
					candidate: mockCandidate,
					testQuestions,
					timeToBegin: 300,
					locations: null
				},
				form: null
			}
		});

		await vi.waitFor(() => {
			expect(screen.getByText('OMR Sheet')).toBeInTheDocument();
		});
		expect(screen.queryByText(mockQuestions[0].question_text)).not.toBeInTheDocument();
	});

	it('should render OmrSheet when omr is OPTIONAL and candidate chose use_omr=true', async () => {
		const testDataOptional = { ...mockTestData, completion_message: null, omr: 'OPTIONAL' };
		const candidateWithOmr = { ...mockCandidate, use_omr: 'true' };

		render(Page, {
			props: {
				data: {
					testData: testDataOptional,
					candidate: candidateWithOmr,
					testQuestions,
					timeToBegin: 300,
					locations: null
				},
				form: null
			}
		});

		await vi.waitFor(() => {
			expect(screen.getByText('OMR Sheet')).toBeInTheDocument();
		});
		expect(screen.queryByText(mockQuestions[0].question_text)).not.toBeInTheDocument();
	});

	it('should render Question when omr is OPTIONAL and candidate chose use_omr=false', async () => {
		const testDataOptional = { ...mockTestData, completion_message: null, omr: 'OPTIONAL' };
		const candidateNoOmr = { ...mockCandidate, use_omr: 'false' };

		render(Page, {
			props: {
				data: {
					testData: testDataOptional,
					candidate: candidateNoOmr,
					testQuestions,
					timeToBegin: 300,
					locations: null
				},
				form: null
			}
		});

		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});
		expect(screen.queryByText('OMR Sheet')).not.toBeInTheDocument();
	});

	it('should render Question when omr mode is NEVER', async () => {
		const testDataNever = { ...mockTestData, completion_message: null, omr: 'NEVER' };

		render(Page, {
			props: {
				data: {
					testData: testDataNever,
					candidate: mockCandidate,
					testQuestions,
					timeToBegin: 300,
					locations: null
				},
				form: null
			}
		});

		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});
		expect(screen.queryByText('OMR Sheet')).not.toBeInTheDocument();
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

	const reviewResponse = () =>
		({
			ok: true,
			json: () =>
				Promise.resolve({
					success: true,
					feedback: mockFeedback,
					testQuestions: mockTestQuestionsResponse
				})
		}) as Response;

	const testDataWithFeedback = {
		...mockTestData,
		completion_message: null,
		show_feedback_on_completion: true
	};

	const renderResult = (testData = testDataWithFeedback) =>
		render(Page, {
			props: {
				data: { testData, timeToBegin: 300, candidate: mockCandidate, testQuestions: null },
				form: { submitTest: true, result: mockResultData, candidate: mockCandidate }
			}
		});

	beforeEach(() => {
		vi.mocked(fetch).mockReset();
	});

	it('should show View All Answers when the setting is on, without fetching the review', () => {
		renderResult();

		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
		expect(screen.getByText('View All Answers')).toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('should NOT show View All Answers when show_feedback_on_completion is false', () => {
		renderResult({ ...testDataWithFeedback, show_feedback_on_completion: false });

		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
		expect(screen.queryByText('View All Answers')).not.toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('should fetch the review and switch to ViewFeedback when the button is clicked', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(reviewResponse());
		renderResult();

		await fireEvent.click(screen.getByText('View All Answers'));

		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith('/api/review-feedback', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ candidate: mockCandidate })
		});
		expect(screen.queryByText('Submitted Successfully')).not.toBeInTheDocument();
	});

	it('should not fetch the review again when it is reopened', async () => {
		vi.mocked(fetch).mockResolvedValueOnce(reviewResponse());
		renderResult();

		await fireEvent.click(screen.getByText('View All Answers'));
		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});

		// ViewFeedback registers its back handler on the nav bar; go back to the result.
		navState.onBack?.();
		await vi.waitFor(() => {
			expect(screen.getByText('View All Answers')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByText('View All Answers'));
		await vi.waitFor(() => {
			expect(screen.getByText(mockQuestions[0].question_text)).toBeInTheDocument();
		});

		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('should stay on the result page and show an error when the review fails to load', async () => {
		vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 502 } as Response);
		renderResult();

		await fireEvent.click(screen.getByText('View All Answers'));

		await vi.waitFor(() => {
			expect(
				screen.getByText('Failed to load your answers. Please try again.')
			).toBeInTheDocument();
		});
		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
		expect(screen.queryByText(mockQuestions[0].question_text)).not.toBeInTheDocument();
	});
});
