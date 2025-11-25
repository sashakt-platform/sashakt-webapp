import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import LandingPage from './LandingPage.svelte';
import { mockTestData } from '$lib/test-utils';

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

vi.mock('$app/state', () => ({
	page: {
		data: {
			timeToBegin: 0
		}
	}
}));

describe('LandingPage', () => {
	const defaultTestDetails = {
		...mockTestData,
		total_questions: 20,
		time_limit: 60,
		question_pagination: 5,
		start_instructions: '<p>Please read carefully before starting.</p>',
		candidate_profile: null
	};

	it('should render test name', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText(defaultTestDetails.name)).toBeInTheDocument();
	});

	it('should render test overview section', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Test Overview')).toBeInTheDocument();
	});

	it('should display total questions', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Total questions')).toBeInTheDocument();
		expect(screen.getByText('20 questions')).toBeInTheDocument();
	});

	it('should display total duration', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Total duration')).toBeInTheDocument();
		expect(screen.getByText('60 minutes')).toBeInTheDocument();
	});

	it('should display questions per page', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Questions per page')).toBeInTheDocument();
		expect(screen.getByText('5 question(s)')).toBeInTheDocument();
	});

	it('should display N/A when time_limit is not set', () => {
		const testDetailsNoTime = {
			...defaultTestDetails,
			time_limit: null
		};

		render(LandingPage, {
			props: {
				testDetails: testDetailsNoTime
			}
		});

		expect(screen.getByText('N/A')).toBeInTheDocument();
	});

	it('should display "All questions" when pagination is not set', () => {
		const testDetailsNoPagination = {
			...defaultTestDetails,
			question_pagination: null
		};

		render(LandingPage, {
			props: {
				testDetails: testDetailsNoPagination
			}
		});

		expect(screen.getByText('All questions')).toBeInTheDocument();
	});

	it('should render general instructions when provided', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('General Instructions')).toBeInTheDocument();
		expect(screen.getByText('Please read carefully before starting.')).toBeInTheDocument();
	});

	it('should not render instructions section when no instructions', () => {
		const testDetailsNoInstructions = {
			...defaultTestDetails,
			start_instructions: null
		};

		render(LandingPage, {
			props: {
				testDetails: testDetailsNoInstructions
			}
		});

		expect(screen.queryByText('General Instructions')).not.toBeInTheDocument();
	});

	it('should render checkbox for terms agreement', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(
			screen.getByText('I have read and understood the instructions as given')
		).toBeInTheDocument();
	});

	it('should render start button', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
	});

	it('should have disabled start button when checkbox is not checked', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		const startButton = screen.getByRole('button', { name: /start/i });
		expect(startButton).toBeDisabled();
	});

	it('should enable start button when checkbox is checked', async () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		const checkbox = screen.getByRole('checkbox');
		await fireEvent.click(checkbox);

		const startButton = screen.getByRole('button', { name: /start/i });
		expect(startButton).not.toBeDisabled();
	});
});
