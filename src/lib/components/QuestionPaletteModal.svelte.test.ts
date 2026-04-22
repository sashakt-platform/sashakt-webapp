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

	it('should display Question Palette heading', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByText('Question Palette')).toBeInTheDocument();
	});

	it('should display a close button', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		const closeButtons = screen.getAllByRole('button', { name: /close/i });
		expect(closeButtons.length).toBeGreaterThan(0);
	});

	it('should show question buttons', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByRole('button', { name: 'Go to question 1' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Go to question 2' })).toBeInTheDocument();
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

	it('should close modal after navigating to a question', async () => {
		let open = true;
		const onNavigate = vi.fn();
		const { rerender } = render(QuestionPaletteModal, {
			props: { ...defaultProps, onNavigate, open }
		});

		const questionButton = screen.getByRole('button', { name: 'Go to question 1' });
		await questionButton.click();

		expect(onNavigate).toHaveBeenCalledWith(0);
	});

	it('should render many questions with scrollable grid', () => {
		const questions = Array.from({ length: 30 }, (_, i) => createQuestion(i + 1, false));

		render(QuestionPaletteModal, {
			props: { ...defaultProps, questions }
		});

		expect(screen.getByRole('button', { name: 'Go to question 1' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Go to question 30' })).toBeInTheDocument();
	});

	it('should show legend labels', () => {
		render(QuestionPaletteModal, { props: defaultProps });

		expect(screen.getByText('Unanswered')).toBeInTheDocument();
		expect(screen.getByText('Answered')).toBeInTheDocument();
		expect(screen.getByText('Mandatory')).toBeInTheDocument();
	});
});
