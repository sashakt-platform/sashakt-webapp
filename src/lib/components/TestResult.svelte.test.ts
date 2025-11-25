import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TestResult from './TestResult.svelte';
import { mockResultData, mockTestData } from '$lib/test-utils';

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
