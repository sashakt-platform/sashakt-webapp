import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/svelte';
import OmrSheet from './OmrSheet.svelte';
import {
	mockCandidate,
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockSubjectiveQuestion,
	createMockResponse
} from '$lib/test-utils';
import type { TQuestion, TSelection } from '$lib/types';
import { createTestSessionStore } from '$lib/helpers/testSession';

vi.mock('$app/forms', () => ({ enhance: () => () => {} }));

vi.mock('$app/state', () => ({
	page: { params: { slug: 'test-slug' }, form: null }
}));

vi.mock('$lib/helpers/testSession', () => ({
	createTestSessionStore: vi.fn(() => ({ current: { selections: [] } }))
}));

vi.mock('$lib/helpers/testFunctionalities', () => ({
	answeredAllMandatory: vi.fn(() => true)
}));

vi.mock('$lib/helpers/formErrorHandler', () => ({
	createFormEnhanceHandler: vi.fn(() => vi.fn())
}));

vi.stubGlobal('fetch', vi.fn());

function makeProps(questions: TQuestion[]) {
	return {
		candidate: mockCandidate,
		testDetails: {},
		testQuestions: { question_revisions: questions }
	};
}

function withSelections(selections: TSelection[]) {
	vi.mocked(createTestSessionStore).mockReturnValue({ current: { selections } } as any);
}

describe('OmrSheet', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createTestSessionStore).mockReturnValue({ current: { selections: [] } } as any);
		vi.mocked(fetch).mockResolvedValue(
			createMockResponse({ success: true }) as unknown as Response
		);
	});

	describe('Rendering', () => {
		it('renders the OMR Sheet heading', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			expect(screen.getByText('OMR Sheet')).toBeInTheDocument();
		});

		it('renders question numbers for each question', () => {
			render(OmrSheet, {
				props: makeProps([mockSingleChoiceQuestion, mockMultipleChoiceQuestion])
			});
			expect(screen.getByText('Q.1:')).toBeInTheDocument();
			expect(screen.getByText('Q.2:')).toBeInTheDocument();
		});

		it('shows mandatory asterisk (*) for mandatory questions', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			expect(screen.getByText('*')).toBeInTheDocument();
		});

		it('renders asterisk as invisible for optional questions to preserve alignment', () => {
			const optional = { ...mockMultipleChoiceQuestion, is_mandatory: false };
			render(OmrSheet, { props: makeProps([optional]) });
			const asterisk = screen.getByText('*');
			expect(asterisk).toBeInTheDocument();
			expect(asterisk).toHaveClass('invisible');
		});

		it('renders option keys A B C D for single-choice', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			['A', 'B', 'C', 'D'].forEach((key) => expect(screen.getByText(key)).toBeInTheDocument());
		});

		it('renders option keys A B C D for multichoice', () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });
			['A', 'B', 'C', 'D'].forEach((key) => expect(screen.getByText(key)).toBeInTheDocument());
		});

		it('renders a Submit button', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			const submitButtons = screen.getAllByRole('button', { name: /submit/i });
			expect(submitButtons.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('Single-choice questions', () => {
		it('renders a radio button for each option', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			expect(screen.getAllByRole('radio')).toHaveLength(mockSingleChoiceQuestion.options.length);
		});

		it('shows no radio selected when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
		});

		it('pre-selects the saved answer on load', () => {
			withSelections([
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[1].id],
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			const radios = screen.getAllByRole('radio');
			expect(radios[1]).toBeChecked();
			expect(radios[0]).not.toBeChecked();
		});

		it('does not call fetch again when the already-selected option is clicked', async () => {
			withSelections([
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [mockSingleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			await fireEvent.click(screen.getAllByRole('radio')[0]);

			await waitFor(() => {
				expect(fetch).not.toHaveBeenCalled();
			});
		});

		it('applies bg-primary class to the selected option label', async () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			const radios = screen.getAllByRole('radio');
			await fireEvent.click(radios[2]);

			await waitFor(() => {
				expect(radios[2].closest('label')).toHaveClass('bg-primary');
			});
		});

		it('calls fetch with the selected option id when a radio is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			await fireEvent.click(screen.getAllByRole('radio')[0]);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					'/test/test-slug/api/submit-answer',
					expect.objectContaining({ method: 'POST' })
				);
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				expect(body.response).toContain(mockSingleChoiceQuestion.options[0].id);
			});
		});

		it('reverts selection when the API call fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			const radios = screen.getAllByRole('radio');
			await fireEvent.click(radios[0]);

			await waitFor(() => {
				expect(radios[0]).not.toBeChecked();
			});
		});

		it('shows loading state (opacity-60) while submitting', async () => {
			let resolveFetch!: (v: unknown) => void;
			vi.mocked(fetch).mockImplementationOnce(
				() => new Promise((resolve) => (resolveFetch = resolve))
			);

			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			await fireEvent.click(screen.getAllByRole('radio')[0]);

			await waitFor(() => {
				expect(document.querySelector('.opacity-60.pointer-events-none')).toBeInTheDocument();
			});

			resolveFetch(createMockResponse({ success: true }));

			await waitFor(() => {
				expect(document.querySelector('.opacity-60.pointer-events-none')).not.toBeInTheDocument();
			});
		});
	});

	describe('Multichoice questions', () => {
		it('renders a checkbox for each option', () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });
			expect(screen.getAllByRole('checkbox')).toHaveLength(
				mockMultipleChoiceQuestion.options.length
			);
		});

		it('shows no checkbox checked when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });
			screen.getAllByRole('checkbox').forEach((cb) => expect(cb).not.toBeChecked());
		});

		it('pre-checks saved answers on load', () => {
			withSelections([
				{
					question_revision_id: mockMultipleChoiceQuestion.id,
					response: [
						mockMultipleChoiceQuestion.options[0].id,
						mockMultipleChoiceQuestion.options[2].id
					],
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();
			expect(checkboxes[2]).toBeChecked();
			expect(checkboxes[3]).not.toBeChecked();
		});

		it('calls fetch when a checkbox is checked', async () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });

			await fireEvent.click(screen.getAllByRole('checkbox')[0]);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					'/test/test-slug/api/submit-answer',
					expect.objectContaining({ method: 'POST' })
				);
			});
		});

		it('applies bg-primary to a checked option label', async () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			await fireEvent.click(checkboxes[1]);

			await waitFor(() => {
				expect(checkboxes[1].closest('label')).toHaveClass('bg-primary');
			});
		});

		it('removes bg-primary from label after unchecking', async () => {
			withSelections([
				{
					question_revision_id: mockMultipleChoiceQuestion.id,
					response: [mockMultipleChoiceQuestion.options[0].id],
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			await fireEvent.click(checkboxes[0]);

			await waitFor(() => {
				expect(checkboxes[0].closest('label')).not.toHaveClass('bg-primary');
			});
		});

		it('reverts selection when the API call fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			await fireEvent.click(checkboxes[0]);

			await waitFor(() => {
				expect(checkboxes[0]).not.toBeChecked();
			});
		});

		it('allows multiple options to be selected independently', async () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			await fireEvent.click(checkboxes[0]);
			await fireEvent.click(checkboxes[2]);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe('Subjective questions', () => {
		it('renders a textarea', () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			expect(screen.getByRole('textbox')).toBeInTheDocument();
		});

		it('renders a Save Answer button', () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
		});

		it('Save Answer button is disabled when textarea is empty', () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('Save Answer button is enabled after typing', async () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			await fireEvent.input(screen.getByRole('textbox'), {
				target: { value: 'My answer' }
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeEnabled();
		});

		it('shows character count when answer limit is set', () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			expect(screen.getByText(/characters remaining/i)).toBeInTheDocument();
		});

		it('calls fetch when Save Answer is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			await fireEvent.input(screen.getByRole('textbox'), {
				target: { value: 'Test answer' }
			});
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					'/test/test-slug/api/submit-answer',
					expect.objectContaining({ method: 'POST' })
				);
			});
		});

		it('shows Saved state after a successful save', async () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			await fireEvent.input(screen.getByRole('textbox'), {
				target: { value: 'Test answer' }
			});
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
			});
		});

		it('shows Update Answer after modifying a saved answer', async () => {
			render(OmrSheet, { props: makeProps([mockSubjectiveQuestion]) });
			const textarea = screen.getByRole('textbox');

			await fireEvent.input(textarea, { target: { value: 'First answer' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
			await waitFor(() => screen.getByRole('button', { name: /saved/i }));

			await fireEvent.input(textarea, { target: { value: 'Updated answer' } });

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
			});
		});
	});

	describe('Mixed question types in one sheet', () => {
		it('renders radio buttons, checkboxes and textarea together', () => {
			render(OmrSheet, {
				props: makeProps([
					mockSingleChoiceQuestion,
					mockSubjectiveQuestion,
					mockMultipleChoiceQuestion
				])
			});

			expect(screen.getAllByRole('radio')).toHaveLength(mockSingleChoiceQuestion.options.length);
			expect(screen.getAllByRole('checkbox')).toHaveLength(
				mockMultipleChoiceQuestion.options.length
			);
			expect(screen.getByRole('textbox')).toBeInTheDocument();
		});

		it('renders the correct question count labels', () => {
			render(OmrSheet, {
				props: makeProps([
					mockSingleChoiceQuestion,
					mockSubjectiveQuestion,
					mockMultipleChoiceQuestion
				])
			});

			expect(screen.getByText('Q.1:')).toBeInTheDocument();
			expect(screen.getByText('Q.2:')).toBeInTheDocument();
			expect(screen.getByText('Q.3:')).toBeInTheDocument();
		});
	});
});
