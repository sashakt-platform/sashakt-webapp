import TestResult from '$lib/components/TestResult.svelte';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('Test Result Component', () => {
	const resultData = {
		correct_answer: 7,
		incorrect_answer: 2
	};

	const testDetails = {
		name: 'Math Test',
		total_questions: 10
	};

	it('should render test details', () => {
		render(TestResult, {
			props: {
				resultData,
				testDetails
			}
		});

		expect(screen.getByText(testDetails.name)).toBeInTheDocument();
		expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument();
		expect(screen.getByText(/congrats on completing/i)).toBeInTheDocument();
	});

	it('should render result summary when resultData is provided', () => {
		render(TestResult, {
			props: {
				resultData,
				testDetails
			}
		});

		expect(screen.getByText(/you have attempted 9 questions/i)).toBeInTheDocument();

		// Check result table values
		expect(screen.getByText('Correct Answers')).toBeInTheDocument();
		expect(screen.getByText('7')).toBeInTheDocument();

		expect(screen.getByText('Incorrect Answers')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();

		expect(screen.getByText('Not Attempted')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();

		expect(screen.getByText('Total marks obtained')).toBeInTheDocument();
		expect(screen.getByText('7 / 10')).toBeInTheDocument();
	});

	it('should not render result table when result data is missing', () => {
		render(TestResult, {
			props: {
				resultData: null,
				testDetails
			}
		});

		expect(screen.getByText(testDetails.name)).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /submitted successfully/i })).toBeInTheDocument();

		// Should not display the result table
		expect(screen.queryByText(/result summary/i)).not.toBeInTheDocument();
	});
});
