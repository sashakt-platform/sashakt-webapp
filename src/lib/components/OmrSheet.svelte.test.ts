import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/svelte';
import OmrSheet from './OmrSheet.svelte';
import {
	mockCandidate,
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockSubjectiveQuestion,
	mockNumericalIntegerQuestion,
	mockNumericalDecimalQuestion,
	mockMatrixRatingQuestion,
	mockMatrixRatingOptions,
	mockMatrixMatchQuestion,
	mockMatrixInputTextQuestion,
	mockMatrixInputNumberQuestion,
	mockMatrixInputTextOptions,
	mockMatrixInputNumberOptions,
	createMockResponse
} from '$lib/test-utils';
import type { TQuestion, TSelection, TMatrixOptions, TOptions } from '$lib/types';
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
			['A', 'B', 'C', 'D'].forEach((key) => {
				expect(screen.getByText(key)).toBeInTheDocument();
			});
		});

		it('renders option keys A B C D for multichoice', () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });
			['A', 'B', 'C', 'D'].forEach((key) => {
				expect(screen.getByText(key)).toBeInTheDocument();
			});
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
			expect(screen.getAllByRole('radio')).toHaveLength(
				(mockSingleChoiceQuestion.options as TOptions[]).length
			);
		});

		it('shows no radio selected when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });
			screen.getAllByRole('radio').forEach((r) => {
				expect(r).not.toBeChecked();
			});
		});

		it('pre-selects the saved answer on load', () => {
			withSelections([
				{
					question_revision_id: mockSingleChoiceQuestion.id,
					response: [(mockSingleChoiceQuestion.options as TOptions[])[1].id],
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
					response: [(mockSingleChoiceQuestion.options as TOptions[])[0].id],
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
				expect(body.response).toContain((mockSingleChoiceQuestion.options as TOptions[])[0].id);
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

		it('shows loading state (pointer-events-none) while submitting', async () => {
			let resolveFetch!: (value: Response | PromiseLike<Response>) => void;
			vi.mocked(fetch).mockImplementationOnce(
				() => new Promise((resolve) => (resolveFetch = resolve))
			);

			render(OmrSheet, { props: makeProps([mockSingleChoiceQuestion]) });

			await fireEvent.click(screen.getAllByRole('radio')[0]);

			await waitFor(() => {
				expect(document.querySelector('.pointer-events-none')).toBeInTheDocument();
			});

			resolveFetch(createMockResponse({ success: true }));

			await waitFor(() => {
				expect(document.querySelector('.pointer-events-none')).not.toBeInTheDocument();
			});
		});
	});

	describe('Multichoice questions', () => {
		it('renders a checkbox for each option', () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });
			expect(screen.getAllByRole('checkbox')).toHaveLength(
				(mockMultipleChoiceQuestion.options as TOptions[]).length
			);
		});

		it('shows no checkbox checked when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockMultipleChoiceQuestion]) });
			screen.getAllByRole('checkbox').forEach((cb) => {
				expect(cb).not.toBeChecked();
			});
		});

		it('pre-checks saved answers on load', () => {
			withSelections([
				{
					question_revision_id: mockMultipleChoiceQuestion.id,
					response: [
						(mockMultipleChoiceQuestion.options as TOptions[])[0].id,
						(mockMultipleChoiceQuestion.options as TOptions[])[2].id
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
					response: [(mockMultipleChoiceQuestion.options as TOptions[])[0].id],
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

	describe('Numerical integer questions', () => {
		it('renders an input field (not radio or checkbox)', () => {
			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			expect(screen.getByRole('spinbutton')).toBeInTheDocument();
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});

		it('Save Answer button is disabled when input is empty', () => {
			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('Save Answer button is enabled after typing a value', async () => {
			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '8' } });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeEnabled();
		});

		it('calls fetch with the entered value when Save Answer is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '8' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				expect(body.response).toBe('8');
			});
		});

		it('shows Saved state after a successful save', async () => {
			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '8' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
			});
		});

		it('shows Update Answer after modifying a saved answer', async () => {
			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			const input = screen.getByRole('spinbutton');

			await fireEvent.input(input, { target: { value: '8' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
			await waitFor(() => screen.getByRole('button', { name: /saved/i }));

			await fireEvent.input(input, { target: { value: '5' } });

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
			});
		});

		it('pre-populates an existing integer answer from selections', () => {
			withSelections([
				{
					question_revision_id: mockNumericalIntegerQuestion.id,
					response: '8',
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockNumericalIntegerQuestion]) });
			expect(screen.getByRole('spinbutton')).toHaveValue(8);
		});
	});

	describe('Numerical decimal questions', () => {
		it('renders an input field (not radio or checkbox)', () => {
			render(OmrSheet, { props: makeProps([mockNumericalDecimalQuestion]) });
			expect(screen.getByRole('spinbutton')).toBeInTheDocument();
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});

		it('calls fetch with the decimal value when Save Answer is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockNumericalDecimalQuestion]) });
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '3.14' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				expect(body.response).toBe('3.14');
			});
		});

		it('shows Saved state after saving a decimal answer', async () => {
			render(OmrSheet, { props: makeProps([mockNumericalDecimalQuestion]) });
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '3.14' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
			});
		});
	});

	describe('Matrix match questions', () => {
		it('renders column headers for each matrix column', () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			matrix.columns.items.forEach((col) => {
				expect(screen.getByText(col.key)).toBeInTheDocument();
			});
		});

		it('renders row keys in the first cell of each row', () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			matrix.rows.items.forEach((row) => {
				expect(screen.getByText(row.key)).toBeInTheDocument();
			});
		});

		it('renders a checkbox for each row-column combination', () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			const expectedCount = matrix.rows.items.length * matrix.columns.items.length;
			expect(screen.getAllByRole('checkbox')).toHaveLength(expectedCount);
		});

		it('shows all checkboxes unchecked when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });
			screen.getAllByRole('checkbox').forEach((cb) => {
				expect(cb).not.toBeChecked();
			});
		});

		it('does not render any radio buttons', () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
		});

		it('pre-checks saved matrix selections on load', () => {
			withSelections([
				{
					question_revision_id: mockMatrixMatchQuestion.id,
					response: JSON.stringify({ 801: [901], 802: [902] }),
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });
			screen.logTestingPlaygroundURL();

			const checkboxes = screen.getAllByRole('checkbox');

			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();
			expect(checkboxes[2]).not.toBeChecked();
			expect(checkboxes[3]).toBeChecked();
		});

		it('calls fetch when a matrix checkbox is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			await fireEvent.click(screen.getAllByRole('checkbox')[0]);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					'/test/test-slug/api/submit-answer',
					expect.objectContaining({ method: 'POST' })
				);
			});
		});

		it('sends serialized JSON with the correct row-column mapping', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			await fireEvent.click(screen.getAllByRole('checkbox')[0]);

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['801']).toContain(901);
			});
		});

		it('toggles off a checked checkbox when clicked again', async () => {
			withSelections([
				{
					question_revision_id: mockMatrixMatchQuestion.id,
					response: JSON.stringify({ 801: [901] }),
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[0]).toBeChecked();
			await fireEvent.click(checkboxes[0]);

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['801'] ?? []).not.toContain(901);
			});
		});

		it('allows selecting multiple columns for the same row', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			await fireEvent.click(checkboxes[0]);
			await fireEvent.click(checkboxes[1]);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledTimes(2);
				const body = JSON.parse((vi.mocked(fetch).mock.calls[1][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['801']).toContain(901);
				expect(response['801']).toContain(902);
			});
		});

		it('selecting in one row does not affect other rows', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			await fireEvent.click(screen.getAllByRole('checkbox')[0]);
			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['802'] ?? []).toHaveLength(0);
			});
		});

		it('reverts matrix selection when the API call fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			const checkboxes = screen.getAllByRole('checkbox');
			await fireEvent.click(checkboxes[0]);

			await waitFor(() => {
				expect(checkboxes[0]).not.toBeChecked();
			});
		});

		it('shows loading state while submitting a matrix selection', async () => {
			let resolveFetch!: (value: Response | PromiseLike<Response>) => void;
			vi.mocked(fetch).mockImplementationOnce(
				() => new Promise((resolve) => (resolveFetch = resolve))
			);

			render(OmrSheet, { props: makeProps([mockMatrixMatchQuestion]) });

			await fireEvent.click(screen.getAllByRole('checkbox')[0]);

			await waitFor(() => {
				expect(document.querySelector('.pointer-events-none')).toBeInTheDocument();
			});

			resolveFetch(createMockResponse({ success: true }));

			await waitFor(() => {
				expect(document.querySelector('.pointer-events-none')).not.toBeInTheDocument();
			});
		});

		it('renders correctly alongside other question types', () => {
			render(OmrSheet, {
				props: makeProps([mockSingleChoiceQuestion, mockMatrixMatchQuestion])
			});

			expect(screen.getAllByRole('radio')).toHaveLength(
				(mockSingleChoiceQuestion.options as TOptions[]).length
			);

			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			const expectedCheckboxes = matrix.rows.items.length * matrix.columns.items.length;
			expect(screen.getAllByRole('checkbox')).toHaveLength(expectedCheckboxes);
		});
	});

	describe('Matrix Rating questions', () => {
		it('renders the rows label as the first column header', () => {
			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });
			expect(screen.getByText(mockMatrixRatingOptions.rows.label)).toBeInTheDocument();
		});

		it('renders column keys as headers (not values)', () => {
			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });
			mockMatrixRatingOptions.columns.items.forEach((col) => {
				expect(screen.getByText(col.key)).toBeInTheDocument();
				expect(screen.queryByText(`${col.key} – ${col.value}`)).not.toBeInTheDocument();
			});
		});

		it('renders all row labels', () => {
			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });
			mockMatrixRatingOptions.rows.items.forEach((row) => {
				expect(screen.getByText(row.value)).toBeInTheDocument();
			});
		});

		it('renders one radio per cell (rows × columns)', () => {
			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });
			const expectedCount =
				mockMatrixRatingOptions.rows.items.length * mockMatrixRatingOptions.columns.items.length;
			expect(screen.getAllByRole('radio')).toHaveLength(expectedCount);
		});

		it('renders all radios unchecked when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });
			screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
		});

		it('pre-checks the saved radio for each row on load', () => {
			const savedRow = mockMatrixRatingOptions.rows.items[0];
			const savedCol = mockMatrixRatingOptions.columns.items[1];

			withSelections([
				{
					question_revision_id: mockMatrixRatingQuestion.id,
					response: JSON.stringify({ [savedRow.id]: savedCol.id }),
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);

			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });

			const radiosForRow = screen
				.getAllByRole('radio')
				.filter(
					(r) =>
						(r as HTMLInputElement).name ===
						`omr-matrix-${mockMatrixRatingQuestion.id}-row-${savedRow.id}`
				);
			const checked = radiosForRow.find((r) => (r as HTMLInputElement).checked);
			expect(checked).toBeDefined();
			expect((checked as HTMLInputElement).value).toBe(String(savedCol.id));
		});

		it('calls fetch with a JSON-encoded matrix response when a radio is changed', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });

			const firstRow = mockMatrixRatingOptions.rows.items[0];
			const firstCol = mockMatrixRatingOptions.columns.items[0];
			const radio = screen
				.getAllByRole('radio')
				.find(
					(r) =>
						(r as HTMLInputElement).name ===
						`omr-matrix-${mockMatrixRatingQuestion.id}-row-${firstRow.id}`
				) as HTMLElement;

			await fireEvent.change(radio);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					'/test/test-slug/api/submit-answer',
					expect.objectContaining({ method: 'POST' })
				);
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				expect(body.question_revision_id).toBe(mockMatrixRatingQuestion.id);
				const parsed = JSON.parse(body.response);
				expect(parsed[String(firstRow.id)]).toBe(firstCol.id);
			});
		});

		it('reverts selection when the API call fails', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(OmrSheet, { props: makeProps([mockMatrixRatingQuestion]) });

			const firstRow = mockMatrixRatingOptions.rows.items[0];
			const radio = screen
				.getAllByRole('radio')
				.find(
					(r) =>
						(r as HTMLInputElement).name ===
						`omr-matrix-${mockMatrixRatingQuestion.id}-row-${firstRow.id}`
				) as HTMLElement;

			await fireEvent.change(radio);

			await waitFor(() => {
				screen
					.getAllByRole('radio')
					.filter(
						(r) =>
							(r as HTMLInputElement).name ===
							`omr-matrix-${mockMatrixRatingQuestion.id}-row-${firstRow.id}`
					)
					.forEach((r) => expect(r).not.toBeChecked());
			});
		});
	});

	describe('Matrix Input (text) questions', () => {
		it('renders row and column labels as table headers', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			expect(screen.getByText(mockMatrixInputTextOptions.rows.label)).toBeInTheDocument();
			expect(screen.getByText(mockMatrixInputTextOptions.columns.label)).toBeInTheDocument();
		});

		it('renders a text input for each row', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			expect(screen.getAllByRole('textbox')).toHaveLength(
				mockMatrixInputTextOptions.rows.items.length
			);
		});

		it('renders all inputs empty when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			screen.getAllByRole('textbox').forEach((input) => {
				expect(input).toHaveValue('');
			});
		});

		it('renders the Save Answer button', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
		});

		it('Save Answer button is disabled when all inputs are empty', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('Save Answer button is enabled after typing into an input', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeEnabled();
		});

		it('pre-fills inputs from saved selections on load', () => {
			withSelections([
				{
					question_revision_id: mockMatrixInputTextQuestion.id,
					response: JSON.stringify({ '1': 'Paris', '2': 'Tokyo' }),
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
			expect(inputs[0]).toHaveValue('Paris');
			expect(inputs[1]).toHaveValue('Tokyo');
		});

		it('calls fetch with serialized JSON when Save Answer is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					'/test/test-slug/api/submit-answer',
					expect.objectContaining({ method: 'POST' })
				);
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['1']).toBe('Paris');
			});
		});

		it('excludes empty row values from the serialized payload', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });

			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['2']).toBeUndefined();
			});
		});

		it('sends null response when all rows are cleared', async () => {
			withSelections([
				{
					question_revision_id: mockMatrixInputTextQuestion.id,
					response: JSON.stringify({ '1': 'Paris' }),
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');

			await fireEvent.input(inputs[0], { target: { value: '' } });
			await fireEvent.click(screen.getByRole('button', { name: /update answer/i }));

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				expect(body.response).toBeNull();
			});
		});

		it('shows Saved state after a successful save', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
			});
		});

		it('shows Update Answer after modifying a previously saved answer', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');

			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
			await waitFor(() => screen.getByRole('button', { name: /saved/i }));

			await fireEvent.input(inputs[0], { target: { value: 'Lyon' } });
			await waitFor(() => {
				expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
			});
		});

		it('whitespace-only input does not count as a change', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: '   ' } });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('keeps Save Answer enabled after a failed save (no silent data loss)', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
			});
		});

		it('shows loading state while submitting', async () => {
			let resolveFetch!: (value: Response | PromiseLike<Response>) => void;
			vi.mocked(fetch).mockImplementationOnce(
				() => new Promise((resolve) => (resolveFetch = resolve))
			);

			render(OmrSheet, { props: makeProps([mockMatrixInputTextQuestion]) });
			const inputs = screen.getAllByRole('textbox');
			await fireEvent.input(inputs[0], { target: { value: 'Paris' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(document.querySelector('.pointer-events-none')).toBeInTheDocument();
			});

			resolveFetch(createMockResponse({ success: true }));

			await waitFor(() => {
				expect(document.querySelector('.pointer-events-none')).not.toBeInTheDocument();
			});
		});
	});

	describe('Matrix Input (number) questions', () => {
		it('renders a number input (spinbutton) for each row', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			expect(screen.getAllByRole('spinbutton')).toHaveLength(
				mockMatrixInputNumberOptions.rows.items.length
			);
		});

		it('does not render any radio buttons or checkboxes', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});

		it('renders all number inputs empty when there is no prior answer', () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			screen.getAllByRole('spinbutton').forEach((input) => {
				expect(input).toHaveValue(null);
			});
		});

		it('pre-fills number inputs from saved selections on load', () => {
			withSelections([
				{
					question_revision_id: mockMatrixInputNumberQuestion.id,
					response: JSON.stringify({ '1': '5', '2': '10' }),
					visited: true,
					time_spent: 0,
					bookmarked: false,
					is_reviewed: false
				}
			]);
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
			expect(inputs[0]).toHaveValue(5);
			expect(inputs[1]).toHaveValue(10);
		});

		it('calls fetch with the number value when Save Answer is clicked', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const inputs = screen.getAllByRole('spinbutton');
			await fireEvent.input(inputs[0], { target: { value: '7' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
				const response = JSON.parse(body.response);
				expect(response['1']).toBe('7');
			});
		});

		it('blocks non-numeric key input (e.g. letter "a")', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const input = screen.getAllByRole('spinbutton')[0];
			await fireEvent.input(input, { target: { value: 'a' } });
			expect((input as HTMLInputElement).value).toBe('');
		});

		it('allows digit key input', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const input = screen.getAllByRole('spinbutton')[0];
			const notPrevented = await fireEvent.keyDown(input, { key: '5' });
			expect(notPrevented).toBe(true);
		});

		it('allows decimal point key input', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const input = screen.getAllByRole('spinbutton')[0];
			const notPrevented = await fireEvent.keyDown(input, { key: '.' });
			expect(notPrevented).toBe(true);
		});

		it('allows minus sign key input', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const input = screen.getAllByRole('spinbutton')[0];
			const notPrevented = await fireEvent.keyDown(input, { key: '-' });
			expect(notPrevented).toBe(true);
		});

		it('allows Backspace key', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const input = screen.getAllByRole('spinbutton')[0];
			const notPrevented = await fireEvent.keyDown(input, { key: 'Backspace' });
			expect(notPrevented).toBe(true);
		});

		it('allows Ctrl+C shortcut (does not block keyboard shortcuts)', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const input = screen.getAllByRole('spinbutton')[0];
			const notPrevented = await fireEvent.keyDown(input, { key: 'c', ctrlKey: true });
			expect(notPrevented).toBe(true);
		});

		it('shows Saved state after successfully saving a number answer', async () => {
			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const inputs = screen.getAllByRole('spinbutton');
			await fireEvent.input(inputs[0], { target: { value: '42' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
			});
		});

		it('keeps Save Answer enabled after a failed save', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

			render(OmrSheet, { props: makeProps([mockMatrixInputNumberQuestion]) });
			const inputs = screen.getAllByRole('spinbutton');
			await fireEvent.input(inputs[0], { target: { value: '42' } });
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));

			await waitFor(() => {
				expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
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

			expect(screen.getAllByRole('radio')).toHaveLength(
				(mockSingleChoiceQuestion.options as TOptions[]).length
			);
			expect(screen.getAllByRole('checkbox')).toHaveLength(
				(mockMultipleChoiceQuestion.options as TOptions[]).length
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
