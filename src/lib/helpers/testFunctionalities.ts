import type { TQuestion, TSelection } from '$lib/types';

export const answeredAllMandatory = (
	answeredQuestions: TSelection[],
	allQuestions: TQuestion[]
) => {
	const mandatoryQuestionIds = allQuestions
		.filter((question) => question.is_mandatory)
		.map((question) => question.id);

	if (mandatoryQuestionIds.length === 0) return true;

	// only count as answered if response array has at least one answer
	const answeredMandatoryQuestions = answeredQuestions.filter(
		(selection) =>
			mandatoryQuestionIds.includes(selection.question_revision_id) &&
			selection.response &&
			selection.response.length > 0
	);

	return answeredMandatoryQuestions.length === mandatoryQuestionIds.length;
};

export const answeredCurrentMandatory = (
	currentPage: number,
	questionsPerPage: number,
	answeredQuestions: TSelection[],
	allQuestions: TQuestion[]
) => {
	const start = (currentPage - 1) * questionsPerPage;
	const end = start + questionsPerPage;

	const currentQuestions = allQuestions.slice(start, end);
	const currentQuestionIds = currentQuestions.map((q) => q.id);

	// filter selections that belong to current page questions
	const currentSelections = answeredQuestions.filter((selection) =>
		currentQuestionIds.includes(selection.question_revision_id)
	);

	return answeredAllMandatory(currentSelections, currentQuestions);
};
