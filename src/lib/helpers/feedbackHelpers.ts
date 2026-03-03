import { question_type_enum } from '$lib/types';

export const isNumericalAnswerCorrect = (
	questionType: question_type_enum,
	submittedAnswer: string,
	correctAnswer: number
): boolean | null => {
	if (submittedAnswer == null) return null;
	if (correctAnswer == null) return null;
	if (questionType === question_type_enum.NUMERICALINTEGER) {
		const submittedNum = parseInt(submittedAnswer);
		return submittedNum === correctAnswer;
	} else if (questionType === question_type_enum.NUMERICALDECIMAL) {
		const submittedNum = parseFloat(submittedAnswer);
		if (!Number.isFinite(submittedNum) || !Number.isFinite(correctAnswer)) return null;
		return Math.abs(submittedNum - correctAnswer) <= 0.5;
	}
	return null;
};
