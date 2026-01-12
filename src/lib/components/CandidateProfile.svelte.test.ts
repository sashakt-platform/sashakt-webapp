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
	]
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

	it('should render candidate information header', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});

		expect(screen.getByText('Candidate Information')).toBeInTheDocument();
	});

	it('should render form with CLF selection', () => {
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

describe('Support for Localization', () => {
	it('should render localization strings correctly', async () => {
		await setLocaleForTests('hi-IN');
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsWithProfile
			}
		});
		await waitFor(() => {
			expect(screen.getByText('उम्मीदवार की जानकारी')).toBeInTheDocument();
			expect(screen.getByText('कृपया अपने विवरण प्रदान करें')).toBeInTheDocument();
			expect(screen.getByText('CLF *')).toBeInTheDocument();
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
});
