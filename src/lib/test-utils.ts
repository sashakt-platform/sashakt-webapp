/**
 * Test utilities and mock data for unit tests
 */

import { vi } from 'vitest';
import type { TCandidate, TQuestion, TSelection, TTestSession } from './types';
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
	question_type: 'multiple-select' as any,
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
	bookmarked: false
};

export const mockSelections: TSelection[] = [
	mockSelection,
	{
		question_revision_id: 2,
		response: [201, 202],
		visited: true,
		time_spent: 45,
		bookmarked: false
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
	candidate_profile: null,
	profile_list: [],
	locale: DEFAULT_LANGUAGE,
	show_question_palette: true
};

// Mock test questions response (from backend)
export const mockTestQuestionsResponse = {
	question_revisions: mockQuestions,
	question_pagination: 5
};

// Mock result data
export const mockResultData = {
	correct_answer: 5,
	incorrect_answer: 3,
	mandatory_not_attempted: 0,
	optional_not_attempted: 2,
	marks_obtained: 8,
	marks_maximum: 10
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
