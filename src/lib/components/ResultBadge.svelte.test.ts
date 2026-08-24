import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ResultBadge from './ResultBadge.svelte';
import { initializeI18nForTests } from '$lib/test-utils';
import type { TMarks } from '$lib/types';

describe('ResultBadge', () => {
	beforeEach(() => {
		initializeI18nForTests();
	});

	const ladderScheme: TMarks = {
		correct: 4,
		wrong: -2,
		skipped: 0,
		partial: {
			correct_answers: [
				{ num_correct_selected: 1, marks: 1 },
				{ num_correct_selected: 2, marks: 2 }
			]
		}
	};

	it('reports the marks earned for a correct answer', () => {
		render(ResultBadge, { props: { result: 'correct', scheme: ladderScheme } });

		expect(screen.getByText('Correct: +4 marks')).toBeInTheDocument();
	});

	it('reports the marks lost for an incorrect answer', () => {
		render(ResultBadge, { props: { result: 'incorrect', scheme: ladderScheme } });

		expect(screen.getByText('Incorrect: -2 marks')).toBeInTheDocument();
	});

	it('reports the marks a partially correct answer actually earned', () => {
		render(ResultBadge, {
			props: { result: 'partially-correct', scheme: ladderScheme, correctSelected: 1 }
		});

		expect(screen.getByText('Partially Correct: +1 mark')).toBeInTheDocument();
	});

	it('reads the rung matching the number of correct selections', () => {
		render(ResultBadge, {
			props: { result: 'partially-correct', scheme: ladderScheme, correctSelected: 2 }
		});

		expect(screen.getByText('Partially Correct: +2 marks')).toBeInTheDocument();
	});

	it('omits the marks when the caller did not say how many were correct', () => {
		// Better to state the outcome alone than to print a mark that may be wrong.
		render(ResultBadge, { props: { result: 'partially-correct', scheme: ladderScheme } });

		expect(screen.getByText('Partially Correct')).toBeInTheDocument();
	});

	it('omits the marks when no rung matches', () => {
		render(ResultBadge, {
			props: { result: 'partially-correct', scheme: ladderScheme, correctSelected: 3 }
		});

		expect(screen.getByText('Partially Correct')).toBeInTheDocument();
	});

	it('reports an unattempted question', () => {
		render(ResultBadge, { props: { result: 'unattempted', scheme: ladderScheme } });

		expect(screen.getByText('Not Attempted: 0 marks')).toBeInTheDocument();
	});

	it('renders nothing without a result', () => {
		const { container } = render(ResultBadge, { props: { result: null, scheme: ladderScheme } });

		expect(container.querySelector('span')).toBeNull();
	});
});
