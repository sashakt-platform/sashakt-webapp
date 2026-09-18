import { question_type_enum, type TFeedbackTag, type TMarks } from '$lib/types';

export const GRADABLE_QUESTION_TYPES = new Set([
	question_type_enum.SINGLE,
	question_type_enum.MULTIPLE,
	question_type_enum.NUMERICALINTEGER,
	question_type_enum.NUMERICALDECIMAL,
	question_type_enum.MATRIXMATCH
]);

export type TFeedbackEntry = {
	question_revision_id: number;
	submitted_answer: number[] | string;
	correct_answer: number[];
	solution?: string | null;
	tags?: TFeedbackTag[];
};

/**
 * Shape a review-feedback row for the UI.
 *
 * The stored answer is a JSON string, so hand over the parsed array where it is
 * one and the raw string otherwise (subjective answers are plain text).
 */
export const normalizeFeedbackEntry = (item: {
	question_revision_id: number;
	submitted_answer: string | null;
	correct_answer: number[];
	solution?: string | null;
	tags?: TFeedbackTag[];
}): TFeedbackEntry => {
	let submitted: number[] | string = [];
	if (item.submitted_answer) {
		try {
			const parsed = JSON.parse(item.submitted_answer);
			submitted = Array.isArray(parsed) ? parsed : item.submitted_answer;
		} catch {
			submitted = item.submitted_answer;
		}
	}
	return {
		question_revision_id: item.question_revision_id,
		submitted_answer: submitted,
		correct_answer: item.correct_answer,
		solution: item.solution ?? null,
		tags: item.tags ?? []
	};
};

export const parseMatrixAnswer = (
	raw: string | number[] | null | undefined
): Record<string, number[]> => {
	if (!raw || typeof raw !== 'string') return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
};

export type MatrixCellStatus = 'correct' | 'missed' | 'wrong' | 'none';

export const getMatrixCellStatus = (
	rowId: number,
	colId: number,
	submitted: Record<string, number[]>,
	correct: Record<string, number[]>
): MatrixCellStatus => {
	const submittedCols = submitted[String(rowId)] ?? [];
	const correctCols = correct[String(rowId)] ?? [];
	const isSubmitted = submittedCols.includes(colId);
	const isCorrect = correctCols.includes(colId);
	if (isCorrect && isSubmitted) return 'correct';
	if (isCorrect && !isSubmitted) return 'missed';
	if (!isCorrect && isSubmitted) return 'wrong';
	return 'none';
};
import { TOLERANCE } from '$lib/utils';

export const isNumericalAnswerCorrect = (
	questionType: question_type_enum,
	submittedAnswer: string,
	correctAnswer: number
): boolean | null => {
	const answerStr = String(submittedAnswer ?? '');
	if (!answerStr.trim()) return null;
	if (correctAnswer == null) return null;
	if (questionType === question_type_enum.NUMERICALINTEGER) {
		const submittedNum = parseFloat(answerStr);
		return submittedNum === correctAnswer;
	} else if (questionType === question_type_enum.NUMERICALDECIMAL) {
		const submittedNum = parseFloat(answerStr);
		if (!Number.isFinite(submittedNum) || !Number.isFinite(correctAnswer)) return null;
		return Math.abs(submittedNum - correctAnswer) <= TOLERANCE;
	}
	return null;
};

export type TQuestionResult = 'correct' | 'partially-correct' | 'incorrect' | 'unattempted';

/**
 * How many of the correct answers the candidate picked, and whether they also
 * picked anything wrong.
 *
 * Partial credit only applies when nothing wrong was selected — see the
 * scoring rule in the backend's submit_test.
 */
const countCorrectSelected = (
	submitted: number[],
	correctAnswer: number[]
): { correctSelected: number; hasWrong: boolean } => {
	const correctSet = new Set(correctAnswer);
	let correctSelected = 0;
	let hasWrong = false;
	for (const id of new Set(submitted)) {
		if (correctSet.has(id)) correctSelected++;
		else hasWrong = true;
	}
	return { correctSelected, hasWrong };
};

/**
 * The marks a partially correct answer earns, or null when the scheme awards
 * none for that many correct selections.
 *
 * The backend looks for the rung matching the exact count and awards 0 when
 * there is none, so an unmatched count is not the same as a wrong answer.
 */
export const getPartialMarks = (
	scheme: TMarks | null | undefined,
	correctSelected: number
): number | null => {
	const rungs = scheme?.partial?.correct_answers;
	if (!rungs?.length) return null;
	const rung = rungs.find((r) => r.num_correct_selected === correctSelected);
	return rung ? rung.marks : null;
};

/**
 * Classify an answer for display.
 *
 * `scheme` is optional: without it a partially correct answer cannot be
 * distinguished from a wrong one, so callers that show marks should pass it.
 * Note the backend counts a partially correct answer in its `correct` tally,
 * so summaries must treat 'partially-correct' as attempted-and-credited.
 */
export const getQuestionResult = (
	questionType: question_type_enum,
	submitted: number[] | string | null | undefined,
	correctAnswer: number[] | number | null | undefined,
	scheme?: TMarks | null
): TQuestionResult => {
	if (
		questionType === question_type_enum.NUMERICALINTEGER ||
		questionType === question_type_enum.NUMERICALDECIMAL
	) {
		const submittedStr = typeof submitted === 'string' ? submitted : String(submitted ?? '');
		const correctNum =
			typeof correctAnswer === 'number'
				? correctAnswer
				: Array.isArray(correctAnswer)
					? correctAnswer[0]
					: null;
		if (correctNum == null) return 'unattempted';
		const result = isNumericalAnswerCorrect(questionType, submittedStr, correctNum);
		if (result === null) return 'unattempted';
		return result ? 'correct' : 'incorrect';
	}

	if (questionType === question_type_enum.SINGLE || questionType === question_type_enum.MULTIPLE) {
		if (!Array.isArray(submitted) || submitted.length === 0) return 'unattempted';
		if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) return 'unattempted';
		const { correctSelected, hasWrong } = countCorrectSelected(submitted, correctAnswer);
		if (!hasWrong && correctSelected === correctAnswer.length) return 'correct';
		if (!hasWrong && correctSelected > 0 && getPartialMarks(scheme, correctSelected) !== null) {
			return 'partially-correct';
		}
		return 'incorrect';
	}

	if (questionType === question_type_enum.MATRIXMATCH) {
		const sub = parseMatrixAnswer(submitted as string);
		const cor = parseMatrixAnswer(correctAnswer as string);
		if (Object.keys(cor).length === 0) return 'unattempted';
		if (Object.keys(sub).length === 0) return 'unattempted';
		const rows = Object.entries(cor);
		const matchedRows = rows.filter(([rowId, correctCols]) => {
			const submittedCols = sub[rowId] ?? [];
			return (
				correctCols.length === submittedCols.length &&
				correctCols.every((id) => submittedCols.includes(id))
			);
		}).length;
		if (matchedRows === rows.length) return 'correct';
		// Matrix-match scores per fully-matched row, so its partial ladder is
		// keyed on the number of matched rows rather than selected options.
		if (matchedRows > 0 && getPartialMarks(scheme, matchedRows) !== null) {
			return 'partially-correct';
		}
		return 'incorrect';
	}

	return 'unattempted';
};

/**
 * How many correct answers were selected, for reporting partial marks.
 *
 * Matrix-match counts fully-matched rows; the option-based types count correct
 * options. Returns null when the answer type carries no such count.
 */
export const getCorrectSelectedCount = (
	questionType: question_type_enum,
	submitted: number[] | string | null | undefined,
	correctAnswer: number[] | number | null | undefined
): number | null => {
	if (questionType === question_type_enum.MATRIXMATCH) {
		const sub = parseMatrixAnswer(submitted as string);
		const cor = parseMatrixAnswer(correctAnswer as string);
		return Object.entries(cor).filter(([rowId, correctCols]) => {
			const submittedCols = sub[rowId] ?? [];
			return (
				correctCols.length === submittedCols.length &&
				correctCols.every((id) => submittedCols.includes(id))
			);
		}).length;
	}
	if (!Array.isArray(submitted) || !Array.isArray(correctAnswer)) return null;
	return countCorrectSelected(submitted, correctAnswer).correctSelected;
};
