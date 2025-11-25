import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CandidateProfile from './CandidateProfile.svelte';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

describe('CandidateProfile', () => {
	const testDetailsWithProfile = {
		name: 'Assessment Test',
		candidate_profile: true,
		profile_list: [
			{ id: 1, name: 'CLF Alpha' },
			{ id: 2, name: 'CLF Beta' },
			{ id: 3, name: 'CLF Gamma' }
		]
	};

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
