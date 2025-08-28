import * as getCandidateHelper from '$lib/helpers/getCandidate';
import * as testServer from '$lib/server/test';
import { fail, redirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actions, load } from './+page.server';

describe('Load Function', () => {
	const mockCandidate = {
		candidate_test_id: 123,
		candidate_uuid: 'uuid123'
	};

	const mockTestData = { id: '123', link: 'abc-test' };

	const cookies = { get: vi.fn() };

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should return full data if candidate exists and API calls succeed', async () => {
		vi.spyOn(getCandidateHelper, 'getCandidate').mockReturnValue(mockCandidate);

		vi.spyOn(testServer, 'getTestQuestions').mockResolvedValue(['q1', 'q2']);
		vi.spyOn(testServer, 'getTimeLeft').mockResolvedValue({ time_left: 120 });

		const result = await load({ locals: { testData: mockTestData }, cookies });

		expect(result).toEqual({
			candidate: mockCandidate,
			testData: mockTestData,
			timeLeft: 120,
			testQuestions: ['q1', 'q2']
		});
	});

	it('should redirect if error occurs during API fetch', async () => {
		vi.spyOn(getCandidateHelper, 'getCandidate').mockReturnValue(mockCandidate);
		vi.spyOn(testServer, 'getTestQuestions').mockRejectedValue(new Error('API failed'));

		const response = load({ locals: { testData: mockTestData }, cookies });

		await expect(response).rejects.toMatchObject({ status: 303, location: '/test/abc-test' });
	});

	it('should return minimal data if candidate is not found', async () => {
		vi.spyOn(getCandidateHelper, 'getCandidate').mockReturnValue(null);

		const result = await load({
			locals: {
				testData: mockTestData,
				timeToBegin: 10
			},
			cookies
		});

		expect(result).toEqual({
			candidate: null,
			testQuestions: null,
			timeToBegin: 10,
			testData: mockTestData
		});
	});
});

describe('Action', () => {
	describe('Create Candidate', () => {
		const mockFetch = vi.fn();
		const mockCookies = { set: vi.fn() };
		const mockRequest = {
			formData: async () => new FormData()
		};

		const mockFormData = new FormData();
		mockFormData.set('deviceInfo', 'macOS');

		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should create candidate and set cookie', async () => {
			const candidateData = { id: 'cand123' };

			const request = {
				formData: async () => mockFormData
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => candidateData
			});

			const result = await actions.createCandidate({
				request,
				locals: { testData: { id: '1', link: 'test-link' } },
				fetch: mockFetch,
				cookies: mockCookies
			});

			expect(mockCookies.set).toHaveBeenCalled();
			expect(result).toEqual({
				success: true,
				candidateData
			});
		});

		it('should redirect on failed response', async () => {
			const request = {
				formData: async () => mockFormData
			};

			mockFetch.mockResolvedValue({ ok: false });

			const response = actions.createCandidate({
				request,
				locals: { testData: { id: '1', link: 'test-link' } },
				fetch: mockFetch,
				cookies: mockCookies
			});

			await expect(response).rejects.toMatchObject({ status: 303, location: '/test/test-link' });
		});
	});

	describe('Submit Test', () => {
		const mockFetch = vi.fn();
		const candidate = {
			candidate_test_id: '123',
			candidate_uuid: 'uuid123'
		};
		const cookies = { get: vi.fn(), getAll: vi.fn() };

		beforeEach(() => {
			vi.spyOn(getCandidateHelper, 'getCandidate').mockReturnValue(candidate);
		});

		it('should return result on successful test submit', async () => {
			mockFetch
				.mockResolvedValueOnce({ status: 200 }) // submit_test
				.mockResolvedValueOnce({ ok: true, json: async () => ({ score: 85 }) }); // result

			const result = await actions.submitTest({ cookies, fetch: mockFetch });
			expect(result).toEqual({ result: { score: 85 }, submitTest: true });
		});

		it('should return fail if result fetch fails', async () => {
			mockFetch.mockResolvedValueOnce({ status: 200 }).mockResolvedValueOnce({ ok: false });

			const result = await actions.submitTest({ cookies, fetch: mockFetch });
			expect(result).toEqual(fail(400, { result: false, submitTest: true }));
		});

		it('should return fail if candidate is missing', async () => {
			vi.spyOn(getCandidateHelper, 'getCandidate').mockReturnValue(null);

			const result = await actions.submitTest({ cookies, fetch: mockFetch });
			expect(result).toEqual(fail(400, { candidate: null, missing: true }));
		});

		it('should handle fetch errors', async () => {
			mockFetch.mockRejectedValue(new Error('Network Error'));

			const result = await actions.submitTest({ cookies, fetch: mockFetch });
			expect(result).toEqual(fail(500, { error: 'Failed to submit test' }));
		});
	});

	describe('actions.reattempt', () => {
		it('should delete candidate cookie and redirect', async () => {
			const cookies = { delete: vi.fn() };
			const locals = { testData: { link: 'sample-link' } };

			const response = actions.reattempt({ cookies, locals });
			expect(cookies.delete).toHaveBeenCalledWith('sashakt-candidate', {
				path: '/test/sample-link'
			});
			await expect(response).rejects.toMatchObject({ status: 301, location: '/test/sample-link' });
		});
	});
});
