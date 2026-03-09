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
