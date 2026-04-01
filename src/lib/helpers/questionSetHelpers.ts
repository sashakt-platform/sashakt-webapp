import type {
	TQuestion,
	TQuestionSetCandidate,
	TQuestionSetSummary,
	TTestQuestionsResponse
} from '$lib/types';

type TQuestionSetLike = {
	id?: number | null;
	display_order: number;
};

export type TQuestionSetGroup = {
	section: TQuestionSetCandidate;
	questions: TQuestion[];
	startIndex: number;
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
	questionSets: TQuestionSetCandidate[];
	isSectioned: boolean;
	sectionByQuestionId: Map<number, TQuestionSetCandidate>;
} {
	const questions = testQuestions?.question_revisions ?? [];
	const questionSets = sortQuestionSets(testQuestions?.question_sets).map((questionSet) => ({
		...questionSet,
		question_revisions: questionSet.question_revisions ?? []
	}));
	const sectionByQuestionId = new Map<number, TQuestionSetCandidate>();

	for (const questionSet of questionSets) {
		for (const question of questionSet.question_revisions) {
			sectionByQuestionId.set(question.id, questionSet);
		}
	}

	return {
		questions,
		questionSets,
		isSectioned: questionSets.length > 0,
		sectionByQuestionId
	};
}

export function buildQuestionSetGroups(
	questions: TQuestion[],
	questionSets: TQuestionSetCandidate[]
): TQuestionSetGroup[] {
	if (questionSets.length === 0) {
		return [];
	}

	const questionIndexById = new Map(questions.map((question, index) => [question.id, index]));

	return questionSets
		.map((questionSet) => {
			const groupedQuestions = questionSet.question_revisions.filter((question) =>
				questionIndexById.has(question.id)
			);
			const startIndex =
				groupedQuestions.length > 0
					? Math.min(
							...groupedQuestions.map((question) => questionIndexById.get(question.id) ?? Infinity)
						)
					: Infinity;

			return {
				section: questionSet,
				questions: groupedQuestions,
				startIndex
			};
		})
		.filter((group) => group.questions.length > 0)
		.sort((a, b) => a.startIndex - b.startIndex);
}

export function canAttemptAllQuestions(
	maxQuestionsAllowedToAttempt: number,
	questionCount: number
): boolean {
	return maxQuestionsAllowedToAttempt >= questionCount;
}

export function getQuestionSetQuestionCount(
	questionSet: TQuestionSetCandidate | TQuestionSetSummary
): number {
	if ('question_count' in questionSet) {
		return questionSet.question_count;
	}

	return questionSet.question_revisions.length;
}
