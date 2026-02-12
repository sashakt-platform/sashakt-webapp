import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import CandidateProfile from './CandidateProfile.svelte';
import { setLocaleForTests } from '$lib/test-utils';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

const testDetailsWithProfile = {
	name: 'Assessment Test',
	candidate_profile: true,
	profile_list: [
		{ id: 1, name: 'CLF Alpha' },
		{ id: 2, name: 'CLF Beta' },
		{ id: 3, name: 'CLF Gamma' }
	],
	omr: 'NEVER'
};

const testDetailsOmrOptional = {
	name: 'OMR Optional Test',
	candidate_profile: null,
	profile_list: [],
	omr: 'OPTIONAL'
};

const testDetailsProfileAndOmr = {
	name: 'Profile + OMR Test',
	candidate_profile: true,
	profile_list: [
		{ id: 1, name: 'CLF Alpha' },
		{ id: 2, name: 'CLF Beta' }
	],
	omr: 'OPTIONAL'
};

describe('CandidateProfile', () => {
	it('should render test name', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByText('Assessment Test')).toBeInTheDocument();
	});

	it('should render candidate information header when profile is required', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByText('Candidate Information')).toBeInTheDocument();
	});

	it('should render form with CLF selection when profile is required', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByText('Please provide your details')).toBeInTheDocument();
		expect(screen.getByText('CLF *')).toBeInTheDocument();
	});

	it('should render continue button', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByRole('button', { name: /continue to test/i })).toBeInTheDocument();
	});

	it('should have disabled button when no entity is selected', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		expect(button).toBeDisabled();
	});

	it('should render select dropdown with placeholder', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByText('Select your CLF')).toBeInTheDocument();
	});
});

describe('CandidateProfile - OMR Mode', () => {
	it('should show OMR Sheet Preference header when no profile but OMR is optional', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('OMR Sheet Preference')).toBeInTheDocument();
	});

	it('should show "Please select your preference" when no profile', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('Please select your preference')).toBeInTheDocument();
	});

	it('should show OMR Mode label when OMR is optional', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('OMR Mode *')).toBeInTheDocument();
	});

	it('should show Select OMR mode placeholder when OMR is optional', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('Select OMR mode')).toBeInTheDocument();
	});

	it('should not show CLF selection when no profile is required', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.queryByText('CLF *')).not.toBeInTheDocument();
	});

	it('should not show OMR dropdown when omr is NEVER', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.queryByText('OMR Mode *')).not.toBeInTheDocument();
		expect(screen.queryByText('Select OMR mode')).not.toBeInTheDocument();
	});

	it('should have disabled button when OMR is optional and no selection is made', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		expect(button).toBeDisabled();
	});

	it('should show both CLF and OMR fields when profile and OMR are both required', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsProfileAndOmr
			}
		});

		expect(screen.getByText('Candidate Information')).toBeInTheDocument();
		expect(screen.getByText('CLF *')).toBeInTheDocument();
		expect(screen.getByText('OMR Mode *')).toBeInTheDocument();
	});

	it('should have disabled button when profile + OMR optional and nothing selected', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsProfileAndOmr
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		expect(button).toBeDisabled();
	});
});

describe('Support for Localization', () => {
	it('should render localization strings correctly in Hindi', async () => {
		await setLocaleForTests('hi-IN');
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});
		await waitFor(() => {
			expect(screen.getByText('उम्मीदवार की जानकारी')).toBeInTheDocument();
			expect(screen.getByText('कृपया अपना विवरण प्रदान करें')).toBeInTheDocument();
			expect(screen.getByText('सीएलएफ *')).toBeInTheDocument();
			expect(screen.getByText('परीक्षा जारी रखें')).toBeInTheDocument();
		});
	});

	it('should render English localization strings correctly', async () => {
		await setLocaleForTests('en-US');
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});
		await waitFor(() => {
			expect(screen.getByText('Candidate Information')).toBeInTheDocument();
			expect(screen.getByText('Please provide your details')).toBeInTheDocument();
			expect(screen.getByText('CLF *')).toBeInTheDocument();
			expect(screen.getByText('Continue to Test')).toBeInTheDocument();
		});
	});

	it('should render OMR strings in Hindi when OMR is optional', async () => {
		await setLocaleForTests('hi-IN');
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});
		await waitFor(() => {
			expect(screen.getByText('OMR शीट वरीयता')).toBeInTheDocument();
			expect(screen.getByText('कृपया अपनी वरीयता चुनें')).toBeInTheDocument();
			expect(screen.getByText('OMR मोड *')).toBeInTheDocument();
			expect(screen.getByText('OMR मोड चुनें')).toBeInTheDocument();
		});
	});

	it('should render OMR strings in English when OMR is optional', async () => {
		await setLocaleForTests('en-US');
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});
		await waitFor(() => {
			expect(screen.getByText('OMR Sheet Preference')).toBeInTheDocument();
			expect(screen.getByText('Please select your preference')).toBeInTheDocument();
			expect(screen.getByText('OMR Mode *')).toBeInTheDocument();
			expect(screen.getByText('Select OMR mode')).toBeInTheDocument();
		});
	});
});
