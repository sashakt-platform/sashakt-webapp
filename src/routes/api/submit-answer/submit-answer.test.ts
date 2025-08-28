import { POST } from './+server';

const BACKEND_URL = 'http://localhost:8000/api/v1';
vi.stubEnv('BACKEND_URL', BACKEND_URL);

// Mocking fetch globally
global.fetch = vi.fn();

const mockRequestJson = (data) => {
	return {
		json: vi.fn().mockResolvedValue(data)
	};
};

describe('Submit answer request handler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return an error if required fields are missing', async () => {
		const request = mockRequestJson({
			question_revision_id: 1,
			response: [1, 2, 3],
			candidate: { candidate_test_id: null, candidate_uuid: null }
		});

		const response = await POST({ request });

		expect(response.status).toBe(400);
		const responseBody = await response.json();
		expect(responseBody.success).toBe(false);
		expect(responseBody.error).toBe('Missing required fields');
	});

	it('should successfully submit answers when provided with valid data', async () => {
		const request = mockRequestJson({
			question_revision_id: 1,
			response: [1, 2, 3],
			candidate: {
				candidate_test_id: 24,
				candidate_uuid: 'uuid-123'
			}
		});

		vi.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK'
		});

		const response = await POST({ request });

		expect(response.status).toBe(200);
		const responseBody = await response.json();
		expect(responseBody.success).toBe(true);
		expect(fetch).toHaveBeenCalledWith(
			`${BACKEND_URL}/candidate/submit_answer/24?candidate_uuid=uuid-123`,
			expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('question_revision_id')
			})
		);
	});

	it('should return an error if the fetch request fails', async () => {
		const request = mockRequestJson({
			question_revision_id: 1,
			response: [1, 2, 3],
			candidate: {
				candidate_test_id: 24,
				candidate_uuid: 'uuid-123'
			}
		});

		vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

		const response = await POST({ request });

		expect(response.status).toBe(500);
		const responseBody = await response.json();
		expect(responseBody.success).toBe(false);
		expect(responseBody.error).toBe('Network error');
	});
});
