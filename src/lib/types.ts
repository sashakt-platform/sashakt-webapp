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
	is_reviewed?: boolean;
	correct_answer?: number[] | number | null;
};

export type TTestSession = {
	candidate: TCandidate;
	selections: TSelection[];
	currentPage: number;
};

export type TMediaImage = {
	gcs_path: string;
	url?: string;
	alt_text?: string;
	content_type: string;
	size_bytes: number;
	uploaded_at: string;
};

export type TExternalMedia = {
	type: string;
	provider: string;
	url: string;
	embed_url?: string | null;
	thumbnail_url?: string | null;
};

export type TMedia = {
	image?: TMediaImage | null;
	external_media?: TExternalMedia | null;
};

export type TOptions = {
	id: number;
	key: string;
	value: string;
	media?: TMedia | null;
};

export enum question_type_enum {
	SINGLE = 'single-choice',
	MULTIPLE = 'multi-choice',
	SUBJECTIVE = 'subjective',
	NUMERICALINTEGER = 'numerical-integer',
	NUMERICALDECIMAL = 'numerical-decimal',
	MATRIXRATING = 'matrix-rating',
	MATRIXMATCH = 'matrix-match',
	MATRIXINPUT = 'matrix-input'
}

export type TMatrixRow = {
	label: string;
	items: TOptions[];
};

export type TMatrixOptions = {
	rows: TMatrixRow;
	columns: TMatrixRow;
};

export type TMatrixInputOptions = {
	rows: TMatrixRow;
	columns: {
		label: string;
		input_type: 'text' | 'number';
	};
};

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
	options: TOptions[] | TMatrixOptions | TMatrixInputOptions;
	subjective_answer_limit: number;
	is_mandatory: boolean;
	marking_scheme: TMarks | null;
	media: TMedia | null;
};

export type TQuestionSetBase = {
	id?: number | null;
	title: string;
	description?: string | null;
	display_order: number;
	max_questions_allowed_to_attempt: number;
	marking_scheme?: TMarks | null;
};

export type TQuestionSetCandidate = TQuestionSetBase & {
	question_revisions: TQuestion[];
};

export type TQuestionSetSummary = TQuestionSetBase & {
	question_count: number;
};

export type TTestQuestionsResponse = {
	question_revisions: TQuestion[];
	question_sets?: TQuestionSetCandidate[] | null;
	question_pagination?: number | null;
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
	submitted_answer: number[] | string;
	correct_answer: number[] | number;
};

export type TOmrMode = 'NEVER' | 'ALWAYS' | 'OPTIONAL';

export type TTestDetails = {
	id: number;
	name: string;
	link: string;
	locale?: string;
	total_questions: number;
	time_limit?: number | null;
	question_pagination?: number | null;
	start_time: string;
	start_instructions?: string;
	completion_message?: string;
	form?: TForm | null;
	omr: TOmrMode;
	show_question_palette: boolean;
	bookmark: boolean;
	show_feedback_immediately: boolean;
	show_feedback_on_completion: boolean;
};
