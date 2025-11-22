import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse } from '$lib/test-utils';
import { getTestDetailsBySlug, getPreTestTimer, getTestQuestions, getTimeLeft } from './test';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	BACKEND_URL: 'http://test-backend.com'
}));

describe('Server API Functions', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	describe('getTestDetailsBySlug', () => {
		it('should fetch test details successfully', async () => {
			const mockTestData = { id: 1, name: 'Test', link: 'test-slug' };
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse(mockTestData) as unknown as Response
			);

			const result = await getTestDetailsBySlug('test-slug');

			expect(fetch).toHaveBeenCalledWith('http://test-backend.com/test/public/test-slug', {
				method: 'GET',
				headers: { accept: 'application/json' }
			});
			expect(result).toEqual({ testData: mockTestData });
		});

		it('should throw error when test is not available', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({}, { ok: false, status: 404 }) as unknown as Response
			);

			await expect(getTestDetailsBySlug('invalid-slug')).rejects.toThrow('Test is not available');
		});
	});

	describe('getPreTestTimer', () => {
		it('should fetch pre-test timer successfully', async () => {
			const mockTimerData = { time_left: 300 };
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse(mockTimerData) as unknown as Response
			);

			const result = await getPreTestTimer('test-uuid');

			expect(fetch).toHaveBeenCalledWith(
				'http://test-backend.com/test/public/time_left/test-uuid',
				{
					method: 'GET',
					headers: { accept: 'application/json' }
				}
			);
			expect(result).toEqual({ timeToBegin: 300 });
		});

		it('should throw error when test UUID is missing', async () => {
			await expect(getPreTestTimer('')).rejects.toThrow('Test UUID is required');
		});

		it('should throw error when fetch fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({}, { ok: false, status: 500 }) as unknown as Response
			);

			await expect(getPreTestTimer('test-uuid')).rejects.toThrow('failed to fetch pre-test timer');
		});
	});

	describe('getTestQuestions', () => {
		it('should fetch test questions successfully', async () => {
			const mockQuestions = {
				question_revisions: [{ id: 1, question_text: 'Q1' }],
				question_pagination: 5
			};
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse(mockQuestions) as unknown as Response
			);

			const result = await getTestQuestions(1, 'candidate-uuid');

			expect(fetch).toHaveBeenCalledWith(
				'http://test-backend.com/candidate/test_questions/1/?candidate_uuid=candidate-uuid',
				{
					method: 'GET',
					headers: { accept: 'application/json' }
				}
			);
			expect(result).toEqual(mockQuestions);
		});

		it('should throw error when candidate_test_id is missing', async () => {
			await expect(getTestQuestions(0, 'uuid')).rejects.toThrow(
				'candidate_test_id and candidate_uuid are required'
			);
		});

		it('should throw error when candidate_uuid is missing', async () => {
			await expect(getTestQuestions(1, '')).rejects.toThrow(
				'candidate_test_id and candidate_uuid are required'
			);
		});

		it('should throw error when fetch fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({}, { ok: false, status: 404 }) as unknown as Response
			);

			await expect(getTestQuestions(1, 'uuid')).rejects.toThrow(
				'Failed to fetch test questions: 404 Error'
			);
		});
	});

	describe('getTimeLeft', () => {
		it('should fetch time left successfully', async () => {
			const mockTimeData = { time_left: 1800 };
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse(mockTimeData) as unknown as Response
			);

			const result = await getTimeLeft(1, 'candidate-uuid');

			expect(fetch).toHaveBeenCalledWith(
				'http://test-backend.com/candidate/time_left/1/?candidate_uuid=candidate-uuid',
				{
					method: 'GET',
					headers: { accept: 'application/json' }
				}
			);
			expect(result).toEqual(mockTimeData);
		});

		it('should throw error when candidate_test_id is missing', async () => {
			await expect(getTimeLeft(0, 'uuid')).rejects.toThrow(
				'candidate_test_id and candidate_uuid are required'
			);
		});

		it('should throw error when candidate_uuid is missing', async () => {
			await expect(getTimeLeft(1, '')).rejects.toThrow(
				'candidate_test_id and candidate_uuid are required'
			);
		});

		it('should throw error when fetch fails', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				createMockResponse({}, { ok: false, status: 500 }) as unknown as Response
			);

			await expect(getTimeLeft(1, 'uuid')).rejects.toThrow('Failed to fetch test time: 500 Error');
		});
	});
});
