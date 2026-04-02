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

	it('should display correct answered count in stats', () => {
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

		// Find the stats section - answered count should be 2
		const answeredStat = screen.getByText('Answered').previousElementSibling;
		expect(answeredStat).toHaveTextContent('2');
	});

	it('should display correct bookmarked count in stats', () => {
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

		// Find the stats section - bookmarked count should be 2
		const bookmarkedStat = screen.getByText('Marked for review').previousElementSibling;
		expect(bookmarkedStat).toHaveTextContent('2');
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
		expect(currentButton).toHaveClass('border-blue-500');
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
		expect(answeredButton).toHaveClass('bg-blue-100');
		expect(answeredButton).toHaveClass('text-blue-700');
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

		const mandatoryButton = screen.getByRole('button', { name: 'Go to question 1' });
		const mandatoryIndicator = mandatoryButton.querySelector('.bg-red-500');
		expect(mandatoryIndicator).toBeInTheDocument();

		const optionalButton = screen.getByRole('button', { name: 'Go to question 2' });
		const noIndicator = optionalButton.querySelector('.bg-red-500');
		expect(noIndicator).toBeNull();
	});

	it('should show bookmark icon for bookmarked questions', () => {
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
		const bookmarkIcon = bookmarkedButton.querySelector('.fill-amber-500');
		expect(bookmarkIcon).toBeInTheDocument();
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

		// Stats should show 0
		const answeredStat = screen.getByText('Answered').previousElementSibling;
		expect(answeredStat).toHaveTextContent('0');
	});

	it('should apply maxRows height limit when provided', () => {
		const questions = Array.from({ length: 30 }, (_, i) => createQuestion(i + 1, false));

		const { container } = render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn(),
				maxRows: 5
			}
		});

		// Grid should have max-height style applied
		// 5 rows * 40px + 4 gaps * 8px = 200 + 32 = 232px
		const grid = container.querySelector('.grid-cols-5');
		expect(grid).toHaveStyle({ maxHeight: '232px' });
	});

	it('should not apply maxRows height limit when not provided', () => {
		const questions = [createQuestion(1, false), createQuestion(2, false)];

		const { container } = render(QuestionPaletteContent, {
			props: {
				questions,
				selections: [],
				currentQuestionIndex: 0,
				onNavigate: vi.fn()
			}
		});

		const grid = container.querySelector('.grid-cols-5');
		// When maxRows is not provided, no inline max-height style should be applied
		expect(grid?.getAttribute('style')).toBeNull();
	});
});
