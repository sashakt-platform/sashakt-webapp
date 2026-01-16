import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QuestionPaletteModal from './QuestionPaletteModal.svelte';
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
const createSelection = (questionId: number, response: number[] = [1]): TSelection => ({
	question_revision_id: questionId,
	response,
	visited: true,
	time_spent: 10,
	bookmarked: false
});

describe('QuestionPaletteModal', () => {
	const defaultProps = {
		open: true,
		questions: [createQuestion(1, false), createQuestion(2, false)],
		selections: [] as TSelection[],
		currentQuestionIndex: 0,
		instructions: '<p>Test instructions</p>',
		onNavigate: vi.fn()
	};

	it('should render modal when open is true', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('should not render modal content when open is false', () => {
		render(QuestionPaletteModal, {
			props: { ...defaultProps, open: false }
		});

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('should display Question palette tab', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByRole('tab', { name: /question palette/i })).toBeInTheDocument();
	});

	it('should display Instructions tab', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByRole('tab', { name: /instructions/i })).toBeInTheDocument();
	});

	it('should show palette tab as active by default', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const paletteTab = screen.getByRole('tab', { name: /question palette/i });
		expect(paletteTab).toHaveAttribute('aria-selected', 'true');
	});

	it('should show question buttons when palette tab is active', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'Go to question 1' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Go to question 2' })).toBeInTheDocument();
	});

	it('should switch to instructions tab when clicked', async () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
		await instructionsTab.click();

		expect(instructionsTab).toHaveAttribute('aria-selected', 'true');
	});

	it('should display instructions content when instructions tab is active', async () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
		await instructionsTab.click();

		expect(screen.getByText('Test instructions')).toBeInTheDocument();
	});

	it('should display no instructions message when instructions are undefined', async () => {
		render(QuestionPaletteModal, {
			props: { ...defaultProps, instructions: undefined }
		});

		const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
		await instructionsTab.click();

		expect(screen.getByText('No instructions available.')).toBeInTheDocument();
	});

	it('should call onNavigate when question is clicked', async () => {
		const onNavigate = vi.fn();
		render(QuestionPaletteModal, {
			props: { ...defaultProps, onNavigate }
		});

		const questionButton = screen.getByRole('button', { name: 'Go to question 2' });
		await questionButton.click();

		expect(onNavigate).toHaveBeenCalledWith(1);
	});

	it('should have proper tab accessibility attributes', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const tablist = screen.getByRole('tablist');
		expect(tablist).toHaveAttribute('aria-label', 'Question palette tabs');

		const paletteTab = screen.getByRole('tab', { name: /question palette/i });
		expect(paletteTab).toHaveAttribute('aria-controls', 'palette-panel');

		const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
		expect(instructionsTab).toHaveAttribute('aria-controls', 'instructions-panel');
	});

	it('should apply active tab styling', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const paletteTab = screen.getByRole('tab', { name: /question palette/i });
		expect(paletteTab).toHaveClass('bg-blue-100');
		expect(paletteTab).toHaveClass('font-bold');
	});

	it('should apply inactive tab styling', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const instructionsTab = screen.getByRole('tab', { name: /instructions/i });
		expect(instructionsTab).toHaveClass('bg-gray-100');
		expect(instructionsTab).toHaveClass('font-medium');
	});

	it('should render many questions with scrollable grid', () => {
		const questions = Array.from({ length: 30 }, (_, i) => createQuestion(i + 1, false));

		render(QuestionPaletteModal, {
			props: { ...defaultProps, questions }
		});

		// All 30 questions should be rendered
		expect(screen.getByRole('button', { name: 'Go to question 1' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Go to question 30' })).toBeInTheDocument();
	});
});
