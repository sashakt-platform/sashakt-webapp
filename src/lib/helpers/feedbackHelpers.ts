import { question_type_enum } from '$lib/types';

export const GRADABLE_QUESTION_TYPES = new Set([
	question_type_enum.SINGLE,
	question_type_enum.MULTIPLE,
	question_type_enum.NUMERICALINTEGER,
	question_type_enum.NUMERICALDECIMAL,
	question_type_enum.MATRIXMATCH
]);

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

export const getQuestionResult = (
	questionType: question_type_enum,
	submitted: number[] | string | null | undefined,
	correctAnswer: number[] | number | null | undefined
): 'correct' | 'incorrect' | 'unattempted' => {
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
		const correctSet = new Set(correctAnswer);
		const submittedSet = new Set(submitted);
		if (
			submittedSet.size === correctSet.size &&
			[...submittedSet].every((id) => correctSet.has(id))
		) {
			return 'correct';
		}
		return 'incorrect';
	}

	if (questionType === question_type_enum.MATRIXMATCH) {
		const sub = parseMatrixAnswer(submitted as string);
		const cor = parseMatrixAnswer(correctAnswer as string);
		if (Object.keys(cor).length === 0) return 'unattempted';
		if (Object.keys(sub).length === 0) return 'unattempted';
		const allCorrect = Object.entries(cor).every(([rowId, correctCols]) => {
			const submittedCols = sub[rowId] ?? [];
			return (
				correctCols.length === submittedCols.length &&
				correctCols.every((id) => submittedCols.includes(id))
			);
		});
		if (allCorrect) return 'correct';
		return 'incorrect';
	}

	return 'unattempted';
};
