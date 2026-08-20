import { question_type_enum } from '$lib/types';

/**
 * What a question type asks of the candidate, in one short phrase.
 *
 * Sections are homogeneous, so a section header can state this once instead of
 * repeating it on every question. Deriving it from the type means an importer
 * does not have to ship the same sentence as prose in the section description
 * (and cannot word it inconsistently between sections).
 *
 * Keep these phrasings answer-shape only -- how many options to pick, what kind
 * of value to enter. Marks belong to the marking scheme, which is rendered
 * separately, and anything exam-specific belongs in the section description.
 */
const QUESTION_TYPE_INSTRUCTIONS: Record<question_type_enum, string> = {
	[question_type_enum.SINGLE]: 'Choose ONE correct option',
	[question_type_enum.MULTIPLE]: 'Choose ONE or MORE correct options',
	[question_type_enum.NUMERICALINTEGER]: 'Enter an integer answer',
	[question_type_enum.NUMERICALDECIMAL]: 'Enter a numerical answer',
	[question_type_enum.SUBJECTIVE]: 'Write your answer',
	[question_type_enum.MATRIXMATCH]: 'Match each row to its column',
	[question_type_enum.MATRIXRATING]: 'Rate each row',
	[question_type_enum.MATRIXINPUT]: 'Enter a value for each row'
};

/**
 * The instruction for a question type, or null for an unknown one.
 *
 * Returns null rather than a fallback so a type added to the backend without a
 * phrasing here shows nothing instead of something misleading.
 */
export const getQuestionTypeInstruction = (
	questionType: question_type_enum | null | undefined
): string | null => {
	if (!questionType) return null;
	return QUESTION_TYPE_INSTRUCTIONS[questionType] ?? null;
};
