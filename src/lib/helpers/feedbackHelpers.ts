import { question_type_enum } from '$lib/types';
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
		if (submittedSet.size === correctSet.size && [...submittedSet].every((id) => correctSet.has(id))) {
			return 'correct';
		}
		return 'incorrect';
	}

	return 'unattempted';
};
