export type TCandidate = {
	candidate_uuid: string;
	candidate_test_id: number;
};

export type TSelection = {
	question_revision_id: number;
	response: number[] | string;
	visited: boolean;
	time_spent: number;
	bookmarked: boolean;
	is_reviewed: boolean;
	correct_answer?: number[];
};

export type TTestSession = {
	candidate: TCandidate;
	selections: TSelection[];
	currentPage: number;
};

export type TOptions = {
	id: number;
	key: string;
	value: string;
};

enum question_type_enum {
	SINGLE = 'single-choice',
	MULTIPLE = 'multi-choice',
	SUBJECTIVE = 'subjective'
}

export type TPartialMark = {
	num_correct_selected: number;
	marks: number;
};

export type TMarks = {
	correct: number;
	wrong: number;
	skipped: number;
	partial?: {
		correct_answers: TPartialMark[];
	};
};

export type TQuestion = {
	id: number;
	question_text: string;
	instructions: string;
	question_type: question_type_enum;
	options: TOptions[];
	subjective_answer_limit: number;
	is_mandatory: boolean;
	marking_scheme: TMarks;
	media: Record<string, unknown> | null;
};

// Form Field Types
export type TFormFieldType =
	| 'full_name'
	| 'email'
	| 'phone'
	| 'text'
	| 'textarea'
	| 'number'
	| 'date'
	| 'select'
	| 'radio'
	| 'checkbox'
	| 'multi_select'
	| 'entity'
	| 'state'
	| 'district'
	| 'block';

export type TFormFieldOption = {
	id: number;
	label: string;
	value: string;
};

export type TFormFieldValidation = {
	min_length?: number | null;
	max_length?: number | null;
	min_value?: number | null;
	max_value?: number | null;
	pattern?: string | null;
	custom_error_message?: string | null;
};

export type TFormField = {
	id: number;
	field_type: TFormFieldType;
	label: string;
	name: string;
	placeholder?: string | null;
	help_text?: string | null;
	is_required: boolean;
	order: number;
	options?: TFormFieldOption[] | null;
	validation?: TFormFieldValidation | null;
	default_value?: string | null;
	entity_type_id?: number | null;
};

export type TForm = {
	id: number;
	name: string;
	description?: string | null;
	fields: TFormField[];
};

export type TFormResponses = Record<string, unknown>;

export type TResultData = {
	correct_answer: number;
	incorrect_answer: number;
	mandatory_not_attempted: number;
	optional_not_attempted: number;
	marks_obtained: number | null;
	marks_maximum: number | null;
	total_questions: number;
	certificate_download_url?: string;
};

export type TFeedback = {
	question_revision_id: number;
	submitted_answer: number[];
	correct_answer: number[];
};
