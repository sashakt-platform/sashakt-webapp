import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import LandingPage from './LandingPage.svelte';
import { mockQuestionSetSummaries, mockTestData, setLocaleForTests } from '$lib/test-utils';

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

const defaultTestDetails = {
	...mockTestData,
	total_questions: 20,
	time_limit: 60,
	question_pagination: 5,
	start_instructions: '<p>Please read carefully before starting.</p>',
	form: null
};
describe('LandingPage', () => {
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
		expect(screen.getByText('20')).toBeInTheDocument();
	});

	it('should display total duration', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Test duration')).toBeInTheDocument();
		expect(screen.getByText('60 minutes')).toBeInTheDocument();
	});

	it('should display questions per page', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Questions per page')).toBeInTheDocument();
		expect(screen.getByText('5')).toBeInTheDocument();
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

	it('should render instructions when provided', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(screen.getByText('Test Instructions')).toBeInTheDocument();
		expect(screen.getByText('Please read carefully before starting.')).toBeInTheDocument();
	});

	it('should render question set summaries when present', () => {
		render(LandingPage, {
			props: {
				testDetails: {
					...defaultTestDetails,
					question_sets: mockQuestionSetSummaries
				}
			}
		});

		expect(screen.getByText('Sections')).toBeInTheDocument();
		expect(screen.getByText('Physics')).toBeInTheDocument();
		expect(screen.getByText('Chemistry')).toBeInTheDocument();
		expect(screen.getAllByText('You may attempt all questions in this section.')).toHaveLength(2);
	});

	it('should render question set descriptions as html', () => {
		render(LandingPage, {
			props: {
				testDetails: {
					...defaultTestDetails,
					question_sets: [
						{
							...mockQuestionSetSummaries[0],
							description: '<u>Single correct option</u><br>Correct: <strong>+4</strong>'
						}
					]
				}
			}
		});

		expect(screen.getByText('Single correct option')).toBeInTheDocument();
		expect(screen.getByText('Correct:')).toBeInTheDocument();
		expect(screen.getByText('+4')).toBeInTheDocument();
		expect(screen.queryByText(/<u>Single correct option<\/u>/)).not.toBeInTheDocument();
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

		expect(screen.queryByText('Test Instructions')).not.toBeInTheDocument();
	});

	it('should render confirmation text', () => {
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});

		expect(
			screen.getByText(
				'By clicking "Start Test," you confirm that you have read and understood all instructions.'
			)
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
});

describe('LandingPage - OMR Mode', () => {
	it('should render Start button  when OMR is OPTIONAL', () => {
		const testDetailsOmrOptional = {
			...defaultTestDetails,
			omr: 'OPTIONAL'
		};

		render(LandingPage, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
	});

	it('should render Start button  when candidate_profile is set', () => {
		const testDetailsWithProfile = {
			...defaultTestDetails,
			candidate_profile: true,
			profile_list: [{ id: 1, name: 'CLF Alpha' }]
		};

		render(LandingPage, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
	});

	it('should render form with submit when OMR is NEVER and no profile', () => {
		const testDetailsNoOmr = {
			...defaultTestDetails,
			candidate_profile: null,
			omr: 'NEVER'
		};

		render(LandingPage, {
			props: {
				testDetails: testDetailsNoOmr
			}
		});

		const button = screen.getByRole('button', { name: /start/i });
		expect(button).toBeInTheDocument();
		expect(button.getAttribute('type')).toBe('submit');
	});
});

describe('Support for Localization', () => {
	it('should render localization strings correctly', async () => {
		await setLocaleForTests('hi-IN');
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});
		await waitFor(() => {
			expect(screen.getByText('परीक्षा का अवलोकन')).toBeInTheDocument();
			expect(screen.getByText('कुल सवाल')).toBeInTheDocument();
			expect(screen.getByText('20')).toBeInTheDocument();
			expect(screen.getByText('60 मिनट')).toBeInTheDocument();
			expect(screen.getByText('प्रति पृष्ठ प्रश्न')).toBeInTheDocument();
			expect(screen.getByText('5')).toBeInTheDocument();
			expect(screen.getByText('परीक्षा के निर्देश')).toBeInTheDocument();
			expect(screen.queryByText('मैंने दिए गए निर्देशों को पढ़ और समझ लिया है।')).not.toBeInTheDocument();
		});
	});

	it('should render English localization strings correctly', async () => {
		await setLocaleForTests('en-US');
		render(LandingPage, {
			props: {
				testDetails: defaultTestDetails
			}
		});
		await waitFor(() => {
			expect(screen.getByText('Test Overview')).toBeInTheDocument();
			expect(screen.getByText('Total questions')).toBeInTheDocument();
			expect(screen.getByText('20')).toBeInTheDocument();
			expect(screen.getByText('Test duration')).toBeInTheDocument();
			expect(screen.getByText('60 minutes')).toBeInTheDocument();
			expect(screen.getByText('Questions per page')).toBeInTheDocument();
			expect(screen.getByText('5')).toBeInTheDocument();
			expect(screen.getByText('Test Instructions')).toBeInTheDocument();
			expect(
				screen.getByText(
					'By clicking "Start Test," you confirm that you have read and understood all instructions.'
				)
			).toBeInTheDocument();
		});
	});
});
