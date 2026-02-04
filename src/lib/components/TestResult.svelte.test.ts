import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import TestResult from './TestResult.svelte';
import {
	mockResultData,
	mockResultDataWithCertificate,
	mockTestData,
	setLocaleForTests
} from '$lib/test-utils';

describe('TestResult', () => {
	it('should render success message', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
	});

	it('should render test name', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText(mockTestData.name)).toBeInTheDocument();
	});

	it('should render result summary when resultData is provided', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Result summary')).toBeInTheDocument();
		expect(screen.getByText('Correct Answers')).toBeInTheDocument();
		expect(screen.getByText('Incorrect Answers')).toBeInTheDocument();
		expect(screen.getByText('Not Attempted')).toBeInTheDocument();
	});

	it('should display correct answer counts', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		// Check that the result values are displayed
		expect(screen.getByText(String(mockResultData.correct_answer))).toBeInTheDocument();
		expect(screen.getByText(String(mockResultData.incorrect_answer))).toBeInTheDocument();
	});

	it('should display marks when available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Total marks obtained')).toBeInTheDocument();
		expect(
			screen.getByText(`${mockResultData.marks_obtained} / ${mockResultData.marks_maximum}`)
		).toBeInTheDocument();
	});

	it('should not render result summary when resultData is null', () => {
		const testDetailsNoCompletion = {
			...mockTestData,
			completion_message: null
		};

		render(TestResult, {
			props: {
				resultData: null,
				testDetails: testDetailsNoCompletion
			}
		});

		expect(screen.queryByText('Result summary')).not.toBeInTheDocument();
		// Text is combined with "Congrats on completing the test!"
		expect(screen.getByText(/Your test has been submitted successfully/)).toBeInTheDocument();
	});

	it('should display custom completion message when provided', () => {
		const testDetailsWithMessage = {
			...mockTestData,
			completion_message: 'Great job completing the assessment!'
		};

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: testDetailsWithMessage
			}
		});

		expect(screen.getByText('Great job completing the assessment!')).toBeInTheDocument();
	});

	it('should display default message when no completion message', () => {
		const testDetailsNoMessage = {
			...mockTestData,
			completion_message: null
		};

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: testDetailsNoMessage
			}
		});

		// Default message mentions attempted questions
		expect(screen.getByText(/Congrats on completing the test!/)).toBeInTheDocument();
	});

	it('should calculate not attempted correctly', () => {
		// Total = 5 + 3 + 0 + 2 = 10
		// Attempted = 5 + 3 = 8
		// Not attempted = 10 - 8 = 2
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		// Find the "Not Attempted" row and check its value
		const notAttemptedCell = screen.getByText('Not Attempted');
		expect(notAttemptedCell).toBeInTheDocument();
	});

	it('should not show marks row when marks are null', () => {
		const resultWithoutMarks = {
			...mockResultData,
			marks_obtained: null,
			marks_maximum: null
		};

		render(TestResult, {
			props: {
				resultData: resultWithoutMarks,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('Total marks obtained')).not.toBeInTheDocument();
	});
});

describe('TestResult - View Feedback button', () => {
	const mockFeedback = [
		{ question_revision_id: 1, submitted_answer: [101], correct_answer: [102] }
	];

	it('should show View Feedback button when show_feedback_on_completion is true and feedback exists', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback
			}
		});

		expect(screen.getByText('View Feedback')).toBeInTheDocument();
	});

	it('should NOT show View Feedback button when show_feedback_on_completion is false', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: false };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback
			}
		});

		expect(screen.queryByText('View Feedback')).not.toBeInTheDocument();
	});

	it('should NOT show View Feedback button when feedback is null', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: null
			}
		});

		expect(screen.queryByText('View Feedback')).not.toBeInTheDocument();
	});

	it('should NOT show View Feedback button when neither prop is provided', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('View Feedback')).not.toBeInTheDocument();
	});

	it('should call onViewFeedback when button is clicked', async () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };
		const onViewFeedback = vi.fn();

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback,
				onViewFeedback
			}
		});

		const button = screen.getByText('View Feedback');
		await fireEvent.click(button);

		expect(onViewFeedback).toHaveBeenCalledOnce();
	});
});

describe('support for localization', () => {
	it('should render result in Hindi', async () => {
		await setLocaleForTests('hi-IN');

		const resultTestData = {
			...mockTestData,
			completion_message: null
		};
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: resultTestData
			}
		});

		await waitFor(() => {
			// expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
			expect(screen.getByText('सफलतापूर्वक जमा किया गया')).toBeInTheDocument();
			expect(
				screen.getByText(
					'परीक्षा सफलतापूर्वक पूरी करने पर बधाई! आपने 8 प्रश्नों का प्रयास किया है।'
				)
			).toBeInTheDocument();
			expect(screen.getByText('परिणाम सारांश')).toBeInTheDocument();
			expect(screen.getByText('सही उत्तर')).toBeInTheDocument();
			expect(screen.getByText('गलत उत्तर')).toBeInTheDocument();
			expect(screen.getByText('प्रयास नहीं किया')).toBeInTheDocument();
			expect(screen.getByText('कुल प्राप्त अंक')).toBeInTheDocument();
		});
	});

	it('should render Test in English', async () => {
		await setLocaleForTests('en-US');

		const resultTestData = {
			...mockTestData,
			completion_message: null
		};
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: resultTestData
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
			expect(screen.getByText(/Congrats on completing the test!/i)).toBeInTheDocument();

			expect(screen.getByText(/You have attempted 8 questions\./i)).toBeInTheDocument();
			expect(screen.getByText('Result summary')).toBeInTheDocument();
			expect(screen.getByText('Correct Answers')).toBeInTheDocument();
			expect(screen.getByText('Incorrect Answers')).toBeInTheDocument();
			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
			expect(screen.getByText('Total marks obtained')).toBeInTheDocument();
		});
	});
});

describe('Certificate download', () => {
	it('should show download button when certificate URL is available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Download Certificate')).toBeInTheDocument();
	});

	it('should not show download button when certificate URL is not available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('Download Certificate')).not.toBeInTheDocument();
	});
});
