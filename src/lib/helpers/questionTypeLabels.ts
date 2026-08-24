import { question_type_enum } from '$lib/types';

/**
 * What a question type asks of the candidate, so a section header can state it
 * once instead of an importer writing the same sentence into every section's
 * description by hand.
 *
 * Answer shape only — marks come from the marking scheme, and anything
 * exam-specific belongs in the section description.
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

/** Null for an unknown type, so nothing is shown rather than a wrong guess. */
export const getQuestionTypeInstruction = (
	questionType: question_type_enum | null | undefined
): string | null => (questionType ? (QUESTION_TYPE_INSTRUCTIONS[questionType] ?? null) : null);
