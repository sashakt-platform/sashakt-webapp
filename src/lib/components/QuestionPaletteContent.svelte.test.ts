import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QuestionPaletteContent from './QuestionPaletteContent.svelte';
import type { TQuestion, TSelection } from '$lib/types';

// Helper to create mock questions
const createQuestion = (id: number, isMandatory: boolean): TQuestion => ({
	id,
	question_text: `Question ${id}`,
	instructions: '',
	question_type: 'single-choice' as any,
	options: [{ id: id * 10, key: 'A', value: 'Option A' }],
	subjective_answer_limit: 0,
	is_mandatory: isMandatory,
	marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
	media: null
});

// Helper to create mock selections
const createSelection = (
	questionId: number,
	response: number[] = [1],
	bookmarked: boolean = false
): TSelection => ({
	question_revision_id: questionId,
	response,
	visited: true,
	time_spent: 10,
	bookmarked
});

describe('QuestionPaletteContent', () => {
	it('should render all question buttons', () => {
		const questions = [
			createQuestion(1, false),
			createQuestion(2, false),
			createQuestion(3, false)
		];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		expect(screen.getByRole('button', { name: 'Go to question 1' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Go to question 2' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Go to question 3' })).toBeInTheDocument();
	});

	it('should display answered label in legend', () => {
		const questions = [
			createQuestion(1, false),
			createQuestion(2, false),
			createQuestion(3, false)
		];
		const selections = [createSelection(1, [101]), createSelection(2, [201])];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections,
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		expect(screen.getByText('Answered')).toBeInTheDocument();
	});

	it('should display marked for review label in legend', () => {
		const questions = [
			createQuestion(1, false),
			createQuestion(2, false),
			createQuestion(3, false)
		];
		const selections = [
			createSelection(1, [101], true),
			createSelection(2, [201], false),
			createSelection(3, [], true)
		];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections,
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		expect(screen.getByText('Marked for Review')).toBeInTheDocument();
	});

	it('should call onNavigate when question button is clicked', async () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];
		const onNavigate = vi.fn();

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate
			}
		});

		const button = screen.getByRole('button', { name: 'Go to question 2' });
		await button.click();

		expect(onNavigate).toHaveBeenCalledWith(1); // Index 1 for question 2
	});

	it('should apply current question styling', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 1,
				onNavigate: vi.fn()
			}
		});

		const currentButton = screen.getByRole('button', { name: 'Go to question 2' });
		expect(currentButton).toHaveClass('ring-primary');
	});

	it('should apply answered question styling', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];
		const selections = [createSelection(1, [101])];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections,
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		const answeredButton = screen.getByRole('button', { name: 'Go to question 1' });
		expect(answeredButton).toHaveClass('bg-success-subtle');
		expect(answeredButton).toHaveClass('text-success');
	});

	it('should show mandatory indicator for mandatory questions', () => {
		const questions = [createQuestion(1, true), createQuestion(2, false)];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		// Mandatory asterisk is outside the button in a wrapper div
		const mandatoryButton = screen.getByRole('button', { name: 'Go to question 1' });
		const wrapper = mandatoryButton.parentElement;
		const asterisk = wrapper?.querySelector('.text-destructive');
		expect(asterisk).toBeInTheDocument();

		// Optional question wrapper should have no asterisk
		const optionalButton = screen.getByRole('button', { name: 'Go to question 2' });
		const optionalWrapper = optionalButton.parentElement;
		const noAsterisk = optionalWrapper?.querySelector('.text-destructive');
		expect(noAsterisk).toBeNull();
	});

	it('should apply bookmark border styling for bookmarked questions', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];
		const selections = [createSelection(1, [101], true)];

		render(QuestionPaletteContent, {
			props: {
				questions,
				selections,
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		const bookmarkedButton = screen.getByRole('button', { name: 'Go to question 1' });
		expect(bookmarkedButton).toHaveClass('border-warning');
	});

	it('should handle empty questions array', () => {
		render(QuestionPaletteContent, {
			props: {
				questions: [],
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		// No question buttons should be present
		expect(screen.queryByRole('button', { name: /Go to question/ })).toBeNull();
		// Legend labels should still be visible
		expect(screen.getByText('Answered')).toBeInTheDocument();
	});

	it('should use default 5-column grid', () => {
		const questions = [createQuestion(1, false)];

		const { container } = render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		const grid = container.querySelector('.grid');
		expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' });
	});

	it('should use custom cols when provided', () => {
		const questions = [createQuestion(1, false)];

		const { container } = render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn(),
				cols: 6
			}
		});

		const grid = container.querySelector('.grid');
		expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' });
	});
});
