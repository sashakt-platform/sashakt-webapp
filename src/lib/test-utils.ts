/**
 * Test utilities and mock data for unit tests
 */

import { vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { question_type_enum } from './types';
import type {
	TCandidate,
	TMatrixOptions,
	TMedia,
	TOptions,
	TQuestion,
	TResultData,
	TSelection,
	TTestSession
} from './types';
import { init, register, waitLocale, locale } from 'svelte-i18n';
import { languages, DEFAULT_LANGUAGE } from './utils';

// Mock candidate data
export const mockCandidate: TCandidate = {
	candidate_uuid: 'test-uuid-123',
	candidate_test_id: 1
};

// Mock test questions
export const mockSingleChoiceQuestion: TQuestion = {
	id: 1,
	question_text: 'What is 2 + 2?',
	instructions: 'Select the correct answer',
	question_type: 'single-choice' as any,
	options: [
		{ id: 101, key: 'A', value: '3' },
		{ id: 102, key: 'B', value: '4' },
		{ id: 103, key: 'C', value: '5' },
		{ id: 104, key: 'D', value: '6' }
	],
	subjective_answer_limit: 0,
	is_mandatory: true,
	marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
	media: null
};

export const mockMultipleChoiceQuestion: TQuestion = {
	id: 2,
	question_text: 'Which are prime numbers?',
	instructions: 'Select all that apply',
	question_type: 'multi-choice' as any,
	options: [
		{ id: 201, key: 'A', value: '2' },
		{ id: 202, key: 'B', value: '3' },
		{ id: 203, key: 'C', value: '4' },
		{ id: 204, key: 'D', value: '5' }
	],
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: { correct: 2, wrong: -1, skipped: 0 },
	media: null
};

export const mockOptionalQuestion: TQuestion = {
	id: 3,
	question_text: 'What is the capital of France?',
	instructions: '',
	question_type: 'single-choice' as any,
	options: [
		{ id: 301, key: 'A', value: 'London' },
		{ id: 302, key: 'B', value: 'Paris' },
		{ id: 303, key: 'C', value: 'Berlin' },
		{ id: 304, key: 'D', value: 'Madrid' }
	],
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
	media: null
};

export const mockSubjectiveQuestion: TQuestion = {
	id: 4,
	question_text: 'Explain the process of photosynthesis.',
	instructions: 'Write your answer in detail',
	question_type: 'subjective' as any,
	options: [],
	subjective_answer_limit: 500,
	is_mandatory: true,
	marking_scheme: { correct: 5, wrong: 0, skipped: 0 },
	media: null
};

export const mockMultiChoiceWithPartialMarks: TQuestion = {
	id: 6,
	question_text: 'Which of the following are programming languages?',
	instructions: 'Select all that apply',
	question_type: 'multi-choice' as any,
	options: [
		{ id: 601, key: 'A', value: 'Python' },
		{ id: 602, key: 'B', value: 'HTML' },
		{ id: 603, key: 'C', value: 'Java' },
		{ id: 604, key: 'D', value: 'CSS' }
	],
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: {
		correct: 4,
		wrong: -1,
		skipped: 0,
		partial: {
			correct_answers: [
				{ num_correct_selected: 1, marks: 1 },
				{ num_correct_selected: 2, marks: 2 }
			]
		}
	},
	media: null
};

export const mockSubjectiveQuestionNoLimit: TQuestion = {
	id: 5,
	question_text: 'Describe your favorite book.',
	instructions: '',
	question_type: 'subjective' as any,
	options: [],
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: { correct: 3, wrong: 0, skipped: 0 },
	media: null
};

export const mockNumericalIntegerQuestion: TQuestion = {
	id: 6,
	question_text: 'What is 5 + 3?',
	instructions: 'Enter the numerical answer',
	question_type: 'numerical-integer' as any,
	options: [],
	subjective_answer_limit: 0,
	is_mandatory: true,
	marking_scheme: { correct: 3, wrong: -1, skipped: 0 },
	media: null
};

export const mockNumericalDecimalQuestion: TQuestion = {
	id: 7,
	question_text: 'What is the value of π (pi)?',
	instructions: 'Enter up to 2 decimal places',
	question_type: 'numerical-decimal' as any,
	options: [],
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: { correct: 2, wrong: 0, skipped: 0 },
	media: null
};

export const mockMatrixRatingOptions: TMatrixOptions = {
	rows: {
		label: 'Subjects',
		items: [
			{ id: 1, key: 'math', value: 'Math' },
			{ id: 2, key: 'physics', value: 'Physics' },
			{ id: 3, key: 'chemistry', value: 'Chemistry' }
		]
	},
	columns: {
		label: 'Difficulty Rating',
		items: [
			{ id: 1, key: '1', value: 'Very difficult' },
			{ id: 2, key: '2', value: 'A little difficult' },
			{ id: 3, key: '3', value: 'Okay / manageable' }
		]
	}
};

export const mockMatrixRatingQuestion: TQuestion = {
	id: 8,
	question_text: 'How difficult do you find the following subjects?',
	instructions: 'Rate each subject',
	question_type: question_type_enum.MATRIXRATING,
	options: mockMatrixRatingOptions as unknown as TOptions[],
	subjective_answer_limit: 0,
	is_mandatory: true,
	marking_scheme: { correct: 0, wrong: 0, skipped: 0 },
	media: null
};

export const mockMatrixMatchQuestion: TQuestion = {
	id: 8,
	question_text: 'Match the following items correctly.',
	instructions: 'Match each item in Column A with its corresponding item in Column B.',
	question_type: 'matrix-match' as any,
	options: {
		rows: {
			label: 'Column A',
			items: [
				{ id: 801, key: 'A', value: 'Apple' },
				{ id: 802, key: 'B', value: 'Banana' }
			]
		},
		columns: {
			label: 'Column B',
			items: [
				{ id: 901, key: 'P', value: 'Red fruit' },
				{ id: 902, key: 'Q', value: 'Yellow fruit' }
			]
		}
	} as TMatrixOptions,
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: { correct: 2, wrong: 0, skipped: 0 },
	media: null
};

// Mock media data
export const mockImageMedia: TMedia = {
	image: {
		gcs_path: 'tests/images/diagram.png',
		url: 'https://storage.example.com/diagram.png',
		alt_text: 'A diagram showing the question',
		content_type: 'image/png',
		size_bytes: 12345,
		uploaded_at: '2025-01-01T00:00:00Z'
	},
	external_media: null
};

export const mockYoutubeMedia: TMedia = {
	image: null,
	external_media: {
		type: 'video',
		provider: 'youtube',
		url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
		thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg'
	}
};

export const mockVimeoMedia: TMedia = {
	image: null,
	external_media: {
		type: 'video',
		provider: 'vimeo',
		url: 'https://vimeo.com/123456',
		embed_url: 'https://player.vimeo.com/video/123456',
		thumbnail_url: null
	}
};

export const mockSpotifyMedia: TMedia = {
	image: null,
	external_media: {
		type: 'audio',
		provider: 'spotify',
		url: 'https://open.spotify.com/track/abc123',
		embed_url: 'https://open.spotify.com/embed/track/abc123',
		thumbnail_url: null
	}
};

export const mockGenericExternalMedia: TMedia = {
	image: null,
	external_media: {
		type: 'link',
		provider: 'generic',
		url: 'https://example.com/resource',
		embed_url: null,
		thumbnail_url: null
	}
};

export const mockImageAndExternalMedia: TMedia = {
	image: {
		gcs_path: 'tests/images/photo.jpg',
		url: 'https://storage.example.com/photo.jpg',
		alt_text: 'A photo',
		content_type: 'image/jpeg',
		size_bytes: 54321,
		uploaded_at: '2025-01-01T00:00:00Z'
	},
	external_media: {
		type: 'video',
		provider: 'youtube',
		url: 'https://www.youtube.com/watch?v=abc123',
		embed_url: 'https://www.youtube.com/embed/abc123',
		thumbnail_url: null
	}
};

export const mockQuestionWithMedia: TQuestion = {
	id: 10,
	question_text: 'Look at the image and select the correct answer.',
	instructions: 'Use the diagram to answer',
	question_type: 'single-choice' as any,
	options: [
		{ id: 1001, key: 'A', value: 'Option A', media: mockImageMedia },
		{ id: 1002, key: 'B', value: 'Option B', media: mockYoutubeMedia },
		{ id: 1003, key: 'C', value: 'Option C' },
		{ id: 1004, key: 'D', value: 'Option D' }
	],
	subjective_answer_limit: 0,
	is_mandatory: true,
	marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
	media: mockImageMedia
};

export const mockQuestions: TQuestion[] = [
	mockSingleChoiceQuestion,
	mockMultipleChoiceQuestion,
	mockOptionalQuestion
];

// Mock selections (answered questions)
export const mockSelection: TSelection = {
	question_revision_id: 1,
	response: [102],
	visited: true,
	time_spent: 30,
	bookmarked: false,
	is_reviewed: false
};

export const mockSelections: TSelection[] = [
	mockSelection,
	{
		question_revision_id: 2,
		response: [201, 202],
		visited: true,
		time_spent: 45,
		bookmarked: false,
		is_reviewed: false
	}
];

// Mock test session
export const mockTestSession: TTestSession = {
	candidate: mockCandidate,
	selections: mockSelections,
	currentPage: 1
};

// Mock test data (from backend)
export const mockTestData = {
	id: 1,
	name: 'Sample Test',
	link: 'sample-test',
	total_questions: 10,
	time_limit: 60,
	question_pagination: 5,
	start_time: new Date().toISOString(),
	start_instructions: '<p>Read all questions carefully before answering.</p>',
	completion_message: 'Thank you for completing the test!',
	form: null,
	locale: DEFAULT_LANGUAGE,
	show_question_palette: true,
	omr: 'NEVER',
	show_feedback_on_completion: true
};

// Mock test questions response (from backend)
export const mockTestQuestionsResponse = {
	question_revisions: mockQuestions,
	question_pagination: 5
};

// Mock result data
export const mockResultData: TResultData = {
	correct_answer: 5,
	incorrect_answer: 3,
	mandatory_not_attempted: 0,
	optional_not_attempted: 2,
	marks_obtained: 8,
	marks_maximum: 10,
	total_questions: 10
};

// Mock result data with certificate
export const mockResultDataWithCertificate: TResultData = {
	...mockResultData,
	certificate_download_url: '/api/v1/certificate/download/31a7d1b0-1549-4b87-978b-f13d7ad3a22c'
};

// Mock cookies interface for testing
export const createMockCookies = (cookieStore: Record<string, string> = {}) => ({
	get: vi.fn((name: string) => cookieStore[name] || undefined),
	set: vi.fn((name: string, value: string, _options?: any) => {
		cookieStore[name] = value;
	}),
	delete: vi.fn((name: string, _options?: any) => {
		delete cookieStore[name];
	}),
	getAll: vi.fn(() => Object.entries(cookieStore).map(([name, value]) => ({ name, value }))),
	serialize: vi.fn(() => '')
});

// Helper to create mock fetch response
export const createMockResponse = (data: any, options: { ok?: boolean; status?: number } = {}) => {
	const { ok = true, status = 200 } = options;
	return Promise.resolve({
		ok,
		status,
		statusText: ok ? 'OK' : 'Error',
		json: () => Promise.resolve(data),
		text: () => Promise.resolve(JSON.stringify(data))
	} as Response);
};

// Helper to create mock fetch that fails
export const createMockFetchError = (message = 'Network error') => {
	return () => Promise.reject(new Error(message));
};

// Helper to create a typed mock RequestEvent with just a URL (for API route handler tests)
export const createRequestEvent = (url: URL) => ({ url }) as Partial<RequestEvent> as RequestEvent;

export function initializeI18nForTests() {
	// Register locales
	register(languages.English, () => import('$locales/en-US.json'));
	register(languages.Hindi, () => import('$locales/hi-IN.json'));

	// Initialize
	init({
		fallbackLocale: DEFAULT_LANGUAGE,
		initialLocale: DEFAULT_LANGUAGE
	});
}

export async function setLocaleForTests(currentLocale: string) {
	locale.set(currentLocale || DEFAULT_LANGUAGE);

	// Wait for locale to load
	await waitLocale();
}
