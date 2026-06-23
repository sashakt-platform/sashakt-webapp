import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MarkingSchemeContent from './MarkingSchemeContent.svelte';
import { initializeI18nForTests } from '$lib/test-utils';
import type { TMarks } from '$lib/types';

describe('MarkingSchemeContent', () => {
	beforeEach(() => {
		initializeI18nForTests();
	});

	const baseScheme: TMarks = { correct: 4, wrong: -1, skipped: 0 };

	it('shows the correct mark with a + prefix', () => {
		render(MarkingSchemeContent, {
			props: { scheme: baseScheme, questionType: 'single-choice' as any }
		});

		expect(screen.getByText('+4')).toBeInTheDocument();
	});

	it('shows the wrong mark as-is when negative (no extra + prefix)', () => {
		render(MarkingSchemeContent, {
			props: { scheme: baseScheme, questionType: 'single-choice' as any }
		});

		expect(screen.getByText('-1')).toBeInTheDocument();
	});

	it('shows the wrong mark with + prefix when positive', () => {
		render(MarkingSchemeContent, {
			props: { scheme: { correct: 2, wrong: 1, skipped: 0 }, questionType: 'single-choice' as any }
		});

		expect(screen.getByText('+1')).toBeInTheDocument();
	});

	it('shows the skipped (unanswered) value', () => {
		render(MarkingSchemeContent, {
			props: { scheme: { correct: 1, wrong: 0, skipped: 0 }, questionType: 'single-choice' as any }
		});

		expect(screen.getByText('Unanswered')).toBeInTheDocument();
	});

	it('shows row labels for Correct, Incorrect, and Unanswered', () => {
		render(MarkingSchemeContent, {
			props: { scheme: baseScheme, questionType: 'single-choice' as any }
		});

		expect(screen.getByText('Correct')).toBeInTheDocument();
		expect(screen.getByText('Incorrect')).toBeInTheDocument();
		expect(screen.getByText('Unanswered')).toBeInTheDocument();
	});

	it('does not show partial marks section for single-choice questions', () => {
		const schemeWithPartial: TMarks = {
			...baseScheme,
			partial: { correct_answers: [{ num_correct_selected: 1, marks: 1 }] }
		};

		render(MarkingSchemeContent, {
			props: { scheme: schemeWithPartial, questionType: 'single-choice' as any }
		});

		expect(screen.queryByText(/Partial marks awarded/)).not.toBeInTheDocument();
	});

	it('shows partial marks section for multi-choice when partial rules exist', () => {
		const schemeWithPartial: TMarks = {
			correct: 4,
			wrong: -1,
			skipped: 0,
			partial: {
				correct_answers: [
					{ num_correct_selected: 1, marks: 1 },
					{ num_correct_selected: 2, marks: 2 }
				]
			}
		};

		render(MarkingSchemeContent, {
			props: { scheme: schemeWithPartial, questionType: 'multi-choice' as any }
		});

		expect(screen.getByText(/Partial marks awarded/)).toBeInTheDocument();
	});

	it('renders each partial mark rule with num_correct_selected and marks', () => {
		const schemeWithPartial: TMarks = {
			correct: 4,
			wrong: -1,
			skipped: 0,
			partial: {
				correct_answers: [
					{ num_correct_selected: 1, marks: 1 },
					{ num_correct_selected: 2, marks: 2 }
				]
			}
		};

		render(MarkingSchemeContent, {
			props: { scheme: schemeWithPartial, questionType: 'multi-choice' as any }
		});

		expect(screen.getByText(/1 correct selected/)).toBeInTheDocument();
		expect(screen.getByText(/2 correct selected/)).toBeInTheDocument();
	});

	it('does not show partial section when partial.correct_answers is empty', () => {
		const schemeEmptyPartial: TMarks = {
			correct: 4,
			wrong: -1,
			skipped: 0,
			partial: { correct_answers: [] }
		};

		render(MarkingSchemeContent, {
			props: { scheme: schemeEmptyPartial, questionType: 'multi-choice' as any }
		});

		expect(screen.queryByText(/Partial marks awarded/)).not.toBeInTheDocument();
	});
});
