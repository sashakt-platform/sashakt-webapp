import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OmrCard from './OmrCard.svelte';
import {
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockSubjectiveQuestion,
	mockSubjectiveQuestionNoLimit,
	mockNumericalIntegerQuestion,
	mockNumericalDecimalQuestion,
	mockMatrixMatchQuestion,
	mockMatrixRatingQuestion,
	mockMatrixRatingOptions,
	mockMatrixInputTextQuestion,
	mockMatrixInputNumberQuestion,
	mockMatrixInputTextOptions,
	mockMatrixInputNumberOptions
} from '$lib/test-utils';
import type { TMatrixOptions, TOptions } from '$lib/types';

function baseProps(overrides = {}) {
	return {
		serialNumber: 1,
		isSubmitting: false,
		radioGroupKey: 0,
		selectedOptionIds: [],
		isSelected: vi.fn(() => false),
		onSelectOption: vi.fn(),
		...overrides
	};
}

describe('OmrCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Question label', () => {
		it('renders Q.1: for index 0', () => {
			render(OmrCard, { props: { question: mockSingleChoiceQuestion, ...baseProps() } });
			expect(screen.getByText('Q.1:')).toBeInTheDocument();
		});

		it('renders Q.3: for serialNumber 3', () => {
			render(OmrCard, {
				props: { question: mockSingleChoiceQuestion, ...baseProps({ serialNumber: 3 }) }
			});
			expect(screen.getByText('Q.3:')).toBeInTheDocument();
		});

		it('shows visible asterisk for mandatory question', () => {
			render(OmrCard, { props: { question: mockSingleChoiceQuestion, ...baseProps() } });
			const asterisk = screen.getByText('*');
			expect(asterisk).toBeInTheDocument();
			expect(asterisk).not.toHaveClass('invisible');
		});

		it('shows invisible asterisk for optional question', () => {
			render(OmrCard, { props: { question: mockMultipleChoiceQuestion, ...baseProps() } });
			const asterisk = screen.getByText('*');
			expect(asterisk).toHaveClass('invisible');
		});
	});

	describe('Loading state', () => {
		it('adds pointer-events-none when isSubmitting', () => {
			const { container } = render(OmrCard, {
				props: { question: mockSingleChoiceQuestion, ...baseProps({ isSubmitting: true }) }
			});
			expect(container.querySelector('.pointer-events-none')).toBeInTheDocument();
		});

		it('does not add pointer-events-none when not submitting', () => {
			const { container } = render(OmrCard, {
				props: { question: mockSingleChoiceQuestion, ...baseProps({ isSubmitting: false }) }
			});
			expect(container.querySelector('.pointer-events-none')).not.toBeInTheDocument();
		});

		it('spinner is invisible when not submitting', () => {
			render(OmrCard, {
				props: { question: mockSingleChoiceQuestion, ...baseProps({ isSubmitting: false }) }
			});
			const spinner = document.querySelector('[class*="invisible"]');
			expect(spinner).toBeInTheDocument();
		});
	});

	describe('Single-choice questions', () => {
		it('renders a radio for each option', () => {
			render(OmrCard, { props: { question: mockSingleChoiceQuestion, ...baseProps() } });
			expect(screen.getAllByRole('radio')).toHaveLength(
				(mockSingleChoiceQuestion.options as TOptions[]).length
			);
		});

		it('renders option keys A B C D', () => {
			render(OmrCard, { props: { question: mockSingleChoiceQuestion, ...baseProps() } });
			['A', 'B', 'C', 'D'].forEach((key) => expect(screen.getByText(key)).toBeInTheDocument());
		});

		it('no radio is selected when selectedOptionIds is empty', () => {
			render(OmrCard, { props: { question: mockSingleChoiceQuestion, ...baseProps() } });
			screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
		});

		it('selects the radio matching selectedOptionIds[0]', () => {
			const options = mockSingleChoiceQuestion.options as TOptions[];
			render(OmrCard, {
				props: {
					question: mockSingleChoiceQuestion,
					...baseProps({
						selectedOptionIds: [options[1].id],
						isSelected: (id: number) => id === options[1].id
					})
				}
			});
			const radios = screen.getAllByRole('radio');
			expect(radios[1]).toBeChecked();
			expect(radios[0]).not.toBeChecked();
		});

		it('applies bg-primary to the selected option label', () => {
			const options = mockSingleChoiceQuestion.options as TOptions[];
			const isSelected = (id: number) => id === options[2].id;
			render(OmrCard, {
				props: {
					question: mockSingleChoiceQuestion,
					...baseProps({ selectedOptionIds: [options[2].id], isSelected })
				}
			});
			const radios = screen.getAllByRole('radio');
			expect(radios[2].closest('label')).toHaveClass('bg-primary');
		});

		it('does not apply bg-primary to unselected labels', () => {
			render(OmrCard, { props: { question: mockSingleChoiceQuestion, ...baseProps() } });
			screen.getAllByRole('radio').forEach((r) => {
				expect(r.closest('label')).not.toHaveClass('bg-primary');
			});
		});

		it('calls onSelectOption with the numeric option id when a radio is clicked', async () => {
			const onSelectOption = vi.fn();
			const options = mockSingleChoiceQuestion.options as TOptions[];
			render(OmrCard, {
				props: { question: mockSingleChoiceQuestion, ...baseProps({ onSelectOption }) }
			});
			await fireEvent.click(screen.getAllByRole('radio')[0]);
			expect(onSelectOption).toHaveBeenCalledWith(options[0].id);
		});
	});

	describe('Multiple-choice questions', () => {
		it('renders a checkbox for each option', () => {
			render(OmrCard, { props: { question: mockMultipleChoiceQuestion, ...baseProps() } });
			expect(screen.getAllByRole('checkbox')).toHaveLength(
				(mockMultipleChoiceQuestion.options as TOptions[]).length
			);
		});

		it('renders option keys A B C D', () => {
			render(OmrCard, { props: { question: mockMultipleChoiceQuestion, ...baseProps() } });
			['A', 'B', 'C', 'D'].forEach((key) => expect(screen.getByText(key)).toBeInTheDocument());
		});

		it('no checkbox is checked when isSelected always returns false', () => {
			render(OmrCard, { props: { question: mockMultipleChoiceQuestion, ...baseProps() } });
			screen.getAllByRole('checkbox').forEach((cb) => expect(cb).not.toBeChecked());
		});

		it('pre-checks the checkbox whose id isSelected returns true for', () => {
			const options = mockMultipleChoiceQuestion.options as TOptions[];
			const isSelected = (id: number) => id === options[0].id || id === options[2].id;
			render(OmrCard, {
				props: { question: mockMultipleChoiceQuestion, ...baseProps({ isSelected }) }
			});
			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();
			expect(checkboxes[2]).toBeChecked();
			expect(checkboxes[3]).not.toBeChecked();
		});

		it('applies bg-primary to checked option labels', () => {
			const options = mockMultipleChoiceQuestion.options as TOptions[];
			const isSelected = (id: number) => id === options[1].id;
			render(OmrCard, {
				props: { question: mockMultipleChoiceQuestion, ...baseProps({ isSelected }) }
			});
			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[1].closest('label')).toHaveClass('bg-primary');
			expect(checkboxes[0].closest('label')).not.toHaveClass('bg-primary');
		});

		it('calls onSelectOption with isRemoving=false when checking an unchecked box', async () => {
			const onSelectOption = vi.fn();
			const options = mockMultipleChoiceQuestion.options as TOptions[];
			render(OmrCard, {
				props: { question: mockMultipleChoiceQuestion, ...baseProps({ onSelectOption }) }
			});
			await fireEvent.click(screen.getAllByRole('checkbox')[0]);
			expect(onSelectOption).toHaveBeenCalledWith(options[0].id, false);
		});

		it('calls onSelectOption with isRemoving=true when unchecking a checked box', async () => {
			const onSelectOption = vi.fn();
			const options = mockMultipleChoiceQuestion.options as TOptions[];
			const isSelected = (id: number) => id === options[0].id;
			render(OmrCard, {
				props: {
					question: mockMultipleChoiceQuestion,
					...baseProps({ onSelectOption, isSelected })
				}
			});
			await fireEvent.click(screen.getAllByRole('checkbox')[0]);
			expect(onSelectOption).toHaveBeenCalledWith(options[0].id, true);
		});
	});

	describe('Subjective questions', () => {
		it('renders a textarea', () => {
			render(OmrCard, { props: { question: mockSubjectiveQuestion, ...baseProps() } });
			expect(screen.getByRole('textbox')).toBeInTheDocument();
		});

		it('renders Save Answer button disabled when candidateInput is empty', () => {
			render(OmrCard, {
				props: { question: mockSubjectiveQuestion, ...baseProps({ candidateInput: '' }) }
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('renders Save Answer button enabled when there is input and unsaved changes', () => {
			render(OmrCard, {
				props: {
					question: mockSubjectiveQuestion,
					...baseProps({ candidateInput: 'My answer', hasUnsavedChanges: true })
				}
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeEnabled();
		});

		it('shows Saved state when answer is saved and unchanged', () => {
			render(OmrCard, {
				props: {
					question: mockSubjectiveQuestion,
					...baseProps({
						candidateInput: 'My answer',
						hasUnsavedChanges: false,
						hasSavedBefore: true
					})
				}
			});
			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
		});

		it('shows Update Answer when a saved answer has new changes', () => {
			render(OmrCard, {
				props: {
					question: mockSubjectiveQuestion,
					...baseProps({
						candidateInput: 'Updated answer',
						hasUnsavedChanges: true,
						hasSavedBefore: true
					})
				}
			});
			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
		});

		it('shows character count when subjective_answer_limit is set', () => {
			render(OmrCard, {
				props: {
					question: mockSubjectiveQuestion,
					...baseProps({ candidateInput: 'Hi' })
				}
			});

			expect(screen.getByText(/characters remaining/i)).toBeInTheDocument();
		});

		it('does not show character count when no limit', () => {
			render(OmrCard, {
				props: { question: mockSubjectiveQuestionNoLimit, ...baseProps() }
			});
			expect(screen.queryByText(/characters remaining/i)).not.toBeInTheDocument();
		});

		it('calls onCandidateInputChange when typing in textarea', async () => {
			const onCandidateInputChange = vi.fn();
			render(OmrCard, {
				props: { question: mockSubjectiveQuestion, ...baseProps({ onCandidateInputChange }) }
			});
			await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'hello' } });
			expect(onCandidateInputChange).toHaveBeenCalledWith('hello');
		});

		it('calls onSubjectiveSubmit when Save Answer is clicked', async () => {
			const onSubjectiveSubmit = vi.fn();
			render(OmrCard, {
				props: {
					question: mockSubjectiveQuestion,
					...baseProps({
						candidateInput: 'My answer',
						hasUnsavedChanges: true,
						onSubjectiveSubmit
					})
				}
			});
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
			expect(onSubjectiveSubmit).toHaveBeenCalledOnce();
		});

		it('respects maxlength from subjective_answer_limit', () => {
			render(OmrCard, { props: { question: mockSubjectiveQuestion, ...baseProps() } });
			const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
			expect(textarea.maxLength).toBe(mockSubjectiveQuestion.subjective_answer_limit);
		});

		it('shows remaining count in red when at character limit', () => {
			render(OmrCard, {
				props: {
					question: mockSubjectiveQuestion,
					...baseProps({ candidateInput: 'x'.repeat(500) })
				}
			});
			const counter = screen.getByText(/characters remaining/i);
			expect(counter).toHaveClass('text-red-500');
		});
	});

	describe('Numerical integer questions', () => {
		it('renders a number input', () => {
			render(OmrCard, { props: { question: mockNumericalIntegerQuestion, ...baseProps() } });
			expect(screen.getByRole('spinbutton')).toBeInTheDocument();
		});

		it('uses step="1" for integer questions', () => {
			render(OmrCard, { props: { question: mockNumericalIntegerQuestion, ...baseProps() } });
			expect(screen.getByRole('spinbutton')).toHaveAttribute('step', '1');
		});

		it('Save Answer is disabled when input is empty', () => {
			render(OmrCard, {
				props: { question: mockNumericalIntegerQuestion, ...baseProps({ candidateInput: '' }) }
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('Save Answer is enabled when value is entered and has unsaved changes', () => {
			render(OmrCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					...baseProps({ candidateInput: '8', hasUnsavedChanges: true })
				}
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeEnabled();
		});

		it('calls onCandidateInputChange on input', async () => {
			const onCandidateInputChange = vi.fn();
			render(OmrCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					...baseProps({ onCandidateInputChange })
				}
			});
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '5' } });
			expect(onCandidateInputChange).toHaveBeenCalledWith('5');
		});

		it('shows Saved state when saved and unchanged', () => {
			render(OmrCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					...baseProps({ candidateInput: '8', hasUnsavedChanges: false, hasSavedBefore: true })
				}
			});
			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
		});

		it('shows Update Answer when saved answer is modified', () => {
			render(OmrCard, {
				props: {
					question: mockNumericalIntegerQuestion,
					...baseProps({ candidateInput: '9', hasUnsavedChanges: true, hasSavedBefore: true })
				}
			});
			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
		});

		it('does not render radio buttons or checkboxes', () => {
			render(OmrCard, { props: { question: mockNumericalIntegerQuestion, ...baseProps() } });
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});
	});

	describe('Numerical decimal questions', () => {
		it('uses step="any" for decimal questions', () => {
			render(OmrCard, { props: { question: mockNumericalDecimalQuestion, ...baseProps() } });
			expect(screen.getByRole('spinbutton')).toHaveAttribute('step', 'any');
		});

		it('calls onCandidateInputChange on input', async () => {
			const onCandidateInputChange = vi.fn();
			render(OmrCard, {
				props: {
					question: mockNumericalDecimalQuestion,
					...baseProps({ onCandidateInputChange })
				}
			});
			await fireEvent.input(screen.getByRole('spinbutton'), { target: { value: '3.14' } });
			expect(onCandidateInputChange).toHaveBeenCalledWith('3.14');
		});
	});

	describe('Matrix match questions', () => {
		it('renders column header keys', () => {
			render(OmrCard, { props: { question: mockMatrixMatchQuestion, ...baseProps() } });
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			matrix.columns.items.forEach((col) => expect(screen.getByText(col.key)).toBeInTheDocument());
		});

		it('renders row keys', () => {
			render(OmrCard, { props: { question: mockMatrixMatchQuestion, ...baseProps() } });
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			matrix.rows.items.forEach((row) => expect(screen.getByText(row.key)).toBeInTheDocument());
		});

		it('renders a checkbox for each row-column combination', () => {
			render(OmrCard, { props: { question: mockMatrixMatchQuestion, ...baseProps() } });
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			const expected = matrix.rows.items.length * matrix.columns.items.length;
			expect(screen.getAllByRole('checkbox')).toHaveLength(expected);
		});

		it('all checkboxes unchecked when matrixSelections is empty', () => {
			render(OmrCard, {
				props: { question: mockMatrixMatchQuestion, ...baseProps({ matrixSelections: {} }) }
			});
			screen.getAllByRole('checkbox').forEach((cb) => expect(cb).not.toBeChecked());
		});

		it('pre-checks checkboxes from matrixSelections', () => {
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			const rowId = String(matrix.rows.items[0].id);
			const colId = matrix.columns.items[0].id;
			render(OmrCard, {
				props: {
					question: mockMatrixMatchQuestion,
					...baseProps({ matrixSelections: { [rowId]: [colId] } })
				}
			});
			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();
		});

		it('calls onMatrixInput with row id string and column id when checkbox changes', async () => {
			const onMatrixInput = vi.fn();
			const matrix = mockMatrixMatchQuestion.options as TMatrixOptions;
			render(OmrCard, {
				props: { question: mockMatrixMatchQuestion, ...baseProps({ onMatrixInput }) }
			});
			await fireEvent.click(screen.getAllByRole('checkbox')[0]);
			expect(onMatrixInput).toHaveBeenCalledWith(
				String(matrix.rows.items[0].id),
				matrix.columns.items[0].id
			);
		});

		it('does not render radio buttons', () => {
			render(OmrCard, { props: { question: mockMatrixMatchQuestion, ...baseProps() } });
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
		});
	});

	describe('Matrix rating questions', () => {
		it('renders rows label as first column header', () => {
			render(OmrCard, { props: { question: mockMatrixRatingQuestion, ...baseProps() } });
			expect(screen.getByText(mockMatrixRatingOptions.rows.label)).toBeInTheDocument();
		});

		it('renders column keys as headers', () => {
			render(OmrCard, { props: { question: mockMatrixRatingQuestion, ...baseProps() } });
			mockMatrixRatingOptions.columns.items.forEach((col) =>
				expect(screen.getByText(col.key)).toBeInTheDocument()
			);
		});

		it('renders row values', () => {
			render(OmrCard, { props: { question: mockMatrixRatingQuestion, ...baseProps() } });
			mockMatrixRatingOptions.rows.items.forEach((row) =>
				expect(screen.getByText(row.value)).toBeInTheDocument()
			);
		});

		it('renders one radio per row-column cell', () => {
			render(OmrCard, { props: { question: mockMatrixRatingQuestion, ...baseProps() } });
			const expected =
				mockMatrixRatingOptions.rows.items.length * mockMatrixRatingOptions.columns.items.length;
			expect(screen.getAllByRole('radio')).toHaveLength(expected);
		});

		it('all radios unchecked when matrixResponse is empty', () => {
			render(OmrCard, {
				props: { question: mockMatrixRatingQuestion, ...baseProps({ matrixResponse: {} }) }
			});
			screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
		});

		it('pre-checks radio from matrixResponse', () => {
			const row = mockMatrixRatingOptions.rows.items[0];
			const col = mockMatrixRatingOptions.columns.items[1];
			render(OmrCard, {
				props: {
					question: mockMatrixRatingQuestion,
					...baseProps({ matrixResponse: { [String(row.id)]: col.id } })
				}
			});
			const radio = screen
				.getAllByRole('radio')
				.find(
					(r) =>
						(r as HTMLInputElement).name ===
							`omr-matrix-${mockMatrixRatingQuestion.id}-row-${row.id}` &&
						(r as HTMLInputElement).value === String(col.id)
				) as HTMLInputElement;
			expect(radio).toBeChecked();
		});

		it('each radio has aria-label with row value and column key', () => {
			render(OmrCard, { props: { question: mockMatrixRatingQuestion, ...baseProps() } });
			const row = mockMatrixRatingOptions.rows.items[0];
			const col = mockMatrixRatingOptions.columns.items[0];
			const radio = screen.getByRole('radio', { name: `${row.value} – ${col.key}` });
			expect(radio).toBeInTheDocument();
		});

		it('calls onMatrixInput with row id and column id on change', async () => {
			const onMatrixInput = vi.fn();
			const row = mockMatrixRatingOptions.rows.items[0];
			const col = mockMatrixRatingOptions.columns.items[0];
			render(OmrCard, {
				props: { question: mockMatrixRatingQuestion, ...baseProps({ onMatrixInput }) }
			});
			const radio = screen.getByRole('radio', { name: `${row.value} – ${col.key}` });
			await fireEvent.change(radio);
			expect(onMatrixInput).toHaveBeenCalledWith(row.id, col.id);
		});

		it('does not render checkboxes', () => {
			render(OmrCard, { props: { question: mockMatrixRatingQuestion, ...baseProps() } });
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});
	});

	describe('Matrix input (text) questions', () => {
		it('renders rows and columns labels as table headers', () => {
			render(OmrCard, { props: { question: mockMatrixInputTextQuestion, ...baseProps() } });
			expect(screen.getByText(mockMatrixInputTextOptions.rows.label)).toBeInTheDocument();
			expect(screen.getByText(mockMatrixInputTextOptions.columns.label)).toBeInTheDocument();
		});

		it('renders a text input for each row', () => {
			render(OmrCard, { props: { question: mockMatrixInputTextQuestion, ...baseProps() } });
			expect(screen.getAllByRole('textbox')).toHaveLength(
				mockMatrixInputTextOptions.rows.items.length
			);
		});

		it('all inputs are empty when matrixInputValues is not provided', () => {
			render(OmrCard, { props: { question: mockMatrixInputTextQuestion, ...baseProps() } });
			screen.getAllByRole('textbox').forEach((input) => {
				expect(input).toHaveValue('');
			});
		});

		it('pre-fills inputs from matrixInputValues prop', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({ matrixInputValues: { '1': 'Paris', '2': 'Tokyo' } })
				}
			});
			const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
			expect(inputs[0]).toHaveValue('Paris');
			expect(inputs[1]).toHaveValue('Tokyo');
		});

		it('calls onMatrixInputChange with rowId and value on input', async () => {
			const onMatrixInputChange = vi.fn();
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({ onMatrixInputChange })
				}
			});
			await fireEvent.input(screen.getAllByRole('textbox')[0], { target: { value: 'Paris' } });
			expect(onMatrixInputChange).toHaveBeenCalledWith(
				mockMatrixInputTextOptions.rows.items[0].id,
				'Paris'
			);
		});

		it('renders the Save Answer button', () => {
			render(OmrCard, { props: { question: mockMatrixInputTextQuestion, ...baseProps() } });
			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
		});

		it('Save Answer button is disabled when hasUnsavedMatrixInputChanges is false', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({ hasUnsavedMatrixInputChanges: false })
				}
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeDisabled();
		});

		it('Save Answer button is enabled when hasUnsavedMatrixInputChanges is true', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({ hasUnsavedMatrixInputChanges: true })
				}
			});
			expect(screen.getByRole('button', { name: /save answer/i })).toBeEnabled();
		});

		it('calls onMatrixInputSave when Save Answer is clicked', async () => {
			const onMatrixInputSave = vi.fn();
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({ hasUnsavedMatrixInputChanges: true, onMatrixInputSave })
				}
			});
			await fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
			expect(onMatrixInputSave).toHaveBeenCalledOnce();
		});

		it('shows Saved state when hasSavedMatrixInputBefore and no unsaved changes', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({
						hasUnsavedMatrixInputChanges: false,
						hasSavedMatrixInputBefore: true
					})
				}
			});
			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
		});

		it('shows Update Answer when there are unsaved changes and a previous save', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({
						hasUnsavedMatrixInputChanges: true,
						hasSavedMatrixInputBefore: true
					})
				}
			});
			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
		});

		it('disables inputs when isSubmitting is true', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputTextQuestion,
					...baseProps({ isSubmitting: true })
				}
			});
			screen.getAllByRole('textbox').forEach((input) => {
				expect(input).toBeDisabled();
			});
		});
	});

	describe('Matrix input (number) questions', () => {
		it('renders a number input (spinbutton) for each row', () => {
			render(OmrCard, { props: { question: mockMatrixInputNumberQuestion, ...baseProps() } });
			expect(screen.getAllByRole('spinbutton')).toHaveLength(
				mockMatrixInputNumberOptions.rows.items.length
			);
		});

		it('renders rows and columns labels as table headers', () => {
			render(OmrCard, { props: { question: mockMatrixInputNumberQuestion, ...baseProps() } });
			expect(screen.getByText(mockMatrixInputNumberOptions.rows.label)).toBeInTheDocument();
			expect(screen.getByText(mockMatrixInputNumberOptions.columns.label)).toBeInTheDocument();
		});

		it('does not render radio buttons or checkboxes', () => {
			render(OmrCard, { props: { question: mockMatrixInputNumberQuestion, ...baseProps() } });
			expect(screen.queryAllByRole('radio')).toHaveLength(0);
			expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
		});

		it('pre-fills number inputs from matrixInputValues prop', () => {
			render(OmrCard, {
				props: {
					question: mockMatrixInputNumberQuestion,
					...baseProps({ matrixInputValues: { '1': '5', '2': '10' } })
				}
			});
			const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
			expect(inputs[0]).toHaveValue(5);
			expect(inputs[1]).toHaveValue(10);
		});

		it('calls onMatrixInputChange with rowId and value on input', async () => {
			const onMatrixInputChange = vi.fn();
			render(OmrCard, {
				props: {
					question: mockMatrixInputNumberQuestion,
					...baseProps({ onMatrixInputChange })
				}
			});
			await fireEvent.input(screen.getAllByRole('spinbutton')[0], { target: { value: '7' } });
			expect(onMatrixInputChange).toHaveBeenCalledWith(
				mockMatrixInputNumberOptions.rows.items[0].id,
				'7'
			);
		});
	});
});
