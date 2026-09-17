import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MarkingSchemeInline from './MarkingSchemeInline.svelte';
import { initializeI18nForTests } from '$lib/test-utils';
import { question_type_enum, type TMarks } from '$lib/types';

describe('MarkingSchemeInline', () => {
	beforeEach(() => {
		initializeI18nForTests();
	});

	const baseScheme: TMarks = { correct: 4, wrong: -1, skipped: 0 };

	// The JEE Advanced shape: +4 all correct, -2 any wrong, a rung per count.
	const ladderScheme: TMarks = {
		correct: 4,
		wrong: -2,
		skipped: 0,
		partial: {
			correct_answers: [
				{ num_correct_selected: 1, marks: 1 },
				{ num_correct_selected: 2, marks: 2 },
				{ num_correct_selected: 3, marks: 3 }
			]
		}
	};

	it('shows correct, wrong and skipped marks on one line', () => {
		render(MarkingSchemeInline, { props: { scheme: baseScheme } });

		expect(screen.getByText('+4')).toBeInTheDocument();
		expect(screen.getByText('-1')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();
	});

	it('shows a positive wrong mark with a + prefix', () => {
		render(MarkingSchemeInline, {
			props: { scheme: { correct: 4, wrong: 1, skipped: 0 } }
		});

		expect(screen.getAllByText('+1').length).toBeGreaterThan(0);
	});

	it('summarises the partial ladder in reading order', () => {
		render(MarkingSchemeInline, {
			props: { scheme: ladderScheme, questionType: question_type_enum.MULTIPLE }
		});

		expect(screen.getByText('+1 / +2 / +3')).toBeInTheDocument();
	});

	it('derives the ladder from the scheme rather than assuming three rungs', () => {
		render(MarkingSchemeInline, {
			props: {
				scheme: {
					...ladderScheme,
					partial: { correct_answers: [{ num_correct_selected: 1, marks: 2 }] }
				},
				questionType: question_type_enum.MULTIPLE
			}
		});

		expect(screen.getByText('+2')).toBeInTheDocument();
		expect(screen.queryByText('+1 / +2 / +3')).not.toBeInTheDocument();
	});

	it('omits the ladder for a type that cannot earn partial credit', () => {
		render(MarkingSchemeInline, {
			props: { scheme: ladderScheme, questionType: question_type_enum.SINGLE }
		});

		expect(screen.queryByText('+1 / +2 / +3')).not.toBeInTheDocument();
	});

	it('shows the ladder when the caller could not determine the type', () => {
		// The landing page carries no question list, so an existing ladder is
		// shown rather than hidden.
		render(MarkingSchemeInline, { props: { scheme: ladderScheme } });

		expect(screen.getByText('+1 / +2 / +3')).toBeInTheDocument();
	});

	it('omits the ladder when the scheme has none', () => {
		render(MarkingSchemeInline, {
			props: { scheme: baseScheme, questionType: question_type_enum.MULTIPLE }
		});

		expect(screen.queryByText(/if no wrong option is selected/)).not.toBeInTheDocument();
	});
});
