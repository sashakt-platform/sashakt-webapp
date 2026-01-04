export type TCandidate = {
	candidate_uuid: string;
	candidate_test_id: number;
};

export type TSelection = {
	question_revision_id: number;
	response: number[];
	visited: boolean;
	time_spent: number;
	skipped: boolean;
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
	MULTIPLE = 'multiple-select'
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
