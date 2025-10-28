import type { TQuestion, TSelection } from '$lib/types';

export const answeredAllMandatory = (
	answeredQuestions: TSelection[],
	allQuestions: TQuestion[]
) => {
	const mandatoryQuestionIds = allQuestions
		.filter((question) => question.is_mandatory)
		.map((question) => question.id);

	if (mandatoryQuestionIds.length === 0) return true;

	const answeredMandatoryQuestions = answeredQuestions.filter((selection) =>
		mandatoryQuestionIds.includes(selection.question_revision_id)
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

	const selectedQuestions = answeredQuestions.slice(start, end);
	const currentQuestions = allQuestions.slice(start, end);
	return answeredAllMandatory(selectedQuestions, currentQuestions);
};
