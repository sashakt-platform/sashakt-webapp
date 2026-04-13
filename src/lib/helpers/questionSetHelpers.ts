import type { TQuestion, TTestQuestionsResponse } from '$lib/types';

type TQuestionSetLike = {
	id?: number | null;
	display_order: number;
};

export function sortQuestionSets<T extends TQuestionSetLike>(
	questionSets: T[] | null | undefined
): T[] {
	return [...(questionSets ?? [])].sort((a, b) => {
		if (a.display_order !== b.display_order) {
			return a.display_order - b.display_order;
		}

		return (a.id ?? 0) - (b.id ?? 0);
	});
}

export function normalizeTestQuestions(testQuestions?: TTestQuestionsResponse | null): {
	questions: TQuestion[];
} {
	const questionSets = sortQuestionSets(testQuestions?.question_sets).map((questionSet) => ({
		...questionSet,
		question_revisions: questionSet.question_revisions ?? []
	}));
	const flatQuestionsFromSets = questionSets.flatMap(
		(questionSet) => questionSet.question_revisions
	);
	const questions =
		(testQuestions?.question_revisions?.length ?? 0) > 0
			? (testQuestions?.question_revisions ?? [])
			: flatQuestionsFromSets;

	return {
		questions
	};
}
