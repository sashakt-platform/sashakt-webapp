import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QuestionCard from './QuestionCard.svelte';
import {
	mockCandidate,
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion
} from '$lib/test-utils';

// Mock fetch
vi.stubGlobal('fetch', vi.fn());

describe('QuestionCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render question text', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText(mockSingleChoiceQuestion.question_text)).toBeInTheDocument();
	});

	it('should render question number and total', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 3,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('OF 10')).toBeInTheDocument();
	});

	it('should render all options for single-choice question', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		mockSingleChoiceQuestion.options.forEach((option) => {
			expect(screen.getByText(new RegExp(`${option.key}\\. ${option.value}`))).toBeInTheDocument();
		});
	});

	it('should render all options for multiple-choice question', () => {
		render(QuestionCard, {
			props: {
				question: mockMultipleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		mockMultipleChoiceQuestion.options.forEach((option) => {
			expect(screen.getByText(new RegExp(`${option.key}\\. ${option.value}`))).toBeInTheDocument();
		});
	});

	it('should display mandatory indicator for mandatory questions', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion, // is_mandatory: true
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		// The asterisk indicates mandatory
		expect(screen.getByText('*')).toBeInTheDocument();
	});

	it('should not display mandatory indicator for optional questions', () => {
		const optionalQuestion = {
			...mockSingleChoiceQuestion,
			is_mandatory: false
		};

		render(QuestionCard, {
			props: {
				question: optionalQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		// Check that there's no asterisk for optional questions
		const questionText = screen.getByText(optionalQuestion.question_text);
		expect(questionText.parentElement?.querySelector('.text-red-500')).not.toBeInTheDocument();
	});

	it('should display marks for the question', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion, // marking_scheme.correct: 1
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText('1 Mark')).toBeInTheDocument();
	});

	it('should display plural marks when more than 1', () => {
		render(QuestionCard, {
			props: {
				question: mockMultipleChoiceQuestion, // marking_scheme.correct: 2
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText('2 Marks')).toBeInTheDocument();
	});

	it('should display instructions when provided', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		expect(screen.getByText(mockSingleChoiceQuestion.instructions)).toBeInTheDocument();
	});

	it('should render radio buttons for single-choice questions', () => {
		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		const radioButtons = screen.getAllByRole('radio');
		expect(radioButtons).toHaveLength(mockSingleChoiceQuestion.options.length);
	});

	it('should render checkboxes for multiple-choice questions', () => {
		render(QuestionCard, {
			props: {
				question: mockMultipleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions: []
			}
		});

		const checkboxes = screen.getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(mockMultipleChoiceQuestion.options.length);
	});

	it('should show selected state for previously answered question', () => {
		const selectedQuestions = [
			{
				question_revision_id: mockSingleChoiceQuestion.id,
				response: [mockSingleChoiceQuestion.options[1].id], // Selected option B
				visited: true,
				time_spent: 10
			}
		];

		render(QuestionCard, {
			props: {
				question: mockSingleChoiceQuestion,
				serialNumber: 1,
				candidate: mockCandidate,
				totalQuestions: 10,
				selectedQuestions
			}
		});

		const radioButtons = screen.getAllByRole('radio');
		expect(radioButtons[1]).toBeChecked();
	});
});
