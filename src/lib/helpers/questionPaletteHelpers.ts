import type { TQuestion, TSelection } from '$lib/types';

/**
 * Check if a question is answered (has at least one response)
 */
export function isQuestionAnswered(questionId: number, selections: TSelection[]): boolean {
	const selection = selections.find((s) => s.question_revision_id === questionId);
	return (selection?.response?.length ?? 0) > 0;
}

/**
 * Check if a question is bookmarked
 */
export function isQuestionBookmarked(questionId: number, selections: TSelection[]): boolean {
	const selection = selections.find((s) => s.question_revision_id === questionId);
	return selection?.bookmarked ?? false;
}

/**
 * Count questions by their status
 */
export function countQuestionStatuses(
	questions: TQuestion[],
	selections: TSelection[]
): {
	answered: number;
	bookmarked: number;
	mandatory: number;
	remainingMandatory: number;
} {
	let answered = 0;
	let bookmarked = 0;

	for (const question of questions) {
		if (isQuestionAnswered(question.id, selections)) {
			answered++;
		}

		if (isQuestionBookmarked(question.id, selections)) {
			bookmarked++;
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
		bookmarked,
		mandatory,
		remainingMandatory: mandatory - answeredMandatory
	};
}
