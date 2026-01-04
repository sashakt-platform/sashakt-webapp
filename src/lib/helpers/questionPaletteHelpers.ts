import type { TQuestion, TSelection } from '$lib/types';

export type QuestionStatus = 'answered' | 'skipped' | 'not-visited';

/**
 * Get the status of a single question based on its selection state
 */
export function getQuestionStatus(questionId: number, selections: TSelection[]): QuestionStatus {
	const selection = selections.find((s) => s.question_revision_id === questionId);

	if (!selection || !selection.visited) {
		return 'not-visited';
	}

	if (selection.skipped) {
		return 'skipped';
	}

	if (selection.response.length > 0) {
		return 'answered';
	}

	return 'not-visited';
}

/**
 * Count questions by their status
 */
export function countQuestionStatuses(
	questions: TQuestion[],
	selections: TSelection[]
): {
	answered: number;
	skipped: number;
	notVisited: number;
	mandatory: number;
	remainingMandatory: number;
} {
	let answered = 0;
	let skipped = 0;
	let notVisited = 0;

	for (const question of questions) {
		const status = getQuestionStatus(question.id, selections);
		switch (status) {
			case 'answered':
				answered++;
				break;
			case 'skipped':
				skipped++;
				break;
			case 'not-visited':
				notVisited++;
				break;
		}
	}

	const mandatory = questions.filter((q) => q.is_mandatory).length;

	const answeredMandatory = questions.filter((q) => {
		if (!q.is_mandatory) return false;
		const selection = selections.find((s) => s.question_revision_id === q.id);
		return selection && selection.response.length > 0;
	}).length;

	return {
		answered,
		skipped,
		notVisited,
		mandatory,
		remainingMandatory: mandatory - answeredMandatory
	};
}
