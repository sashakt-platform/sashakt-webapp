import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import CandidateProfile from './CandidateProfile.svelte';
import { setLocaleForTests } from '$lib/test-utils';

// Mock SvelteKit modules
vi.mock('$app/forms', () => ({
	enhance: () => () => {}
}));

const testDetailsOmrOptional = {
	name: 'OMR Optional Test',
	omr: 'OPTIONAL'
};

const testDetailsOmrNever = {
	name: 'Assessment Test',
	omr: 'NEVER'
};

describe('CandidateProfile', () => {
	it('should render test name', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('OMR Optional Test')).toBeInTheDocument();
	});

	it('should always show OMR Sheet Preference header', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('OMR Sheet Preference')).toBeInTheDocument();
	});

	it('should show "Please select your preference" title', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByText('Please select your preference')).toBeInTheDocument();
	});

	it('should render continue button', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.getByRole('button', { name: /continue to test/i })).toBeInTheDocument();
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

	it('should not show OMR dropdown when omr is NEVER', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrNever
			}
		});

		expect(screen.queryByText('OMR Mode *')).not.toBeInTheDocument();
		expect(screen.queryByText('Select OMR mode')).not.toBeInTheDocument();
	});

	it('should have enabled button when omr is NEVER (no selection required)', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrNever
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		expect(button).not.toBeDisabled();
	});
});

describe('CandidateProfile - OMR Mode', () => {
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

	it('should not show CLF field', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		expect(screen.queryByText('CLF *')).not.toBeInTheDocument();
	});
});

describe('CandidateProfile - onContinue callback', () => {
	it('should call onContinue with omrMode when provided and button is clicked', async () => {
		const onContinue = vi.fn();

		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrNever,
				onContinue
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		await fireEvent.click(button);

		expect(onContinue).toHaveBeenCalledWith('');
	});

	it('should render a button (not form submit) when onContinue is provided', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional,
				onContinue: vi.fn()
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		expect(button).toHaveAttribute('type', 'button');
	});

	it('should render a submit button when onContinue is not provided', () => {
		render(CandidateProfile, {
			props: {
				testDetails: testDetailsOmrOptional
			}
		});

		const button = screen.getByRole('button', { name: /continue to test/i });
		expect(button).toHaveAttribute('type', 'submit');
	});
});

describe('Support for Localization', () => {
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
