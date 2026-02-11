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
	MULTIPLE = 'multiple-select',
	SUBJECTIVE = 'subjective'
}

export type TMarks = {
	correct: number;
	wrong: number;
	skipped: number;
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
