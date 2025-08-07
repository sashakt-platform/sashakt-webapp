import {
	getPreTestTimer,
	getTestDetailsBySlug,
	getTestQuestions,
	getTimeLeft
} from '$lib/server/test';

const BACKEND_URL = 'http://localhost:8000/api/v1';
vi.stubEnv('BACKEND_URL', BACKEND_URL);

describe('Fetch test details', () => {
	it('should fetch test details using slug', async () => {
		const mockTestData = {
			link: 'hello-world'
		};

		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockTestData)
			})
		);

		const data = await getTestDetailsBySlug(mockTestData.link);
		expect(data).toEqual({ testData: mockTestData });

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/test/public/${mockTestData.link}`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});
	});

	it('should throw error if fetch response is not ok', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: false
			})
		);

		const slug = 'link';

		await expect(getTestDetailsBySlug(slug)).rejects.toThrow(/not available/i);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/test/public/${slug}`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});
	});
});

describe('Fetch PreTestTimer', () => {
	it('should throw error if test uuid is not passed', async () => {
		await expect(getPreTestTimer('')).rejects.toThrow(/is\s+required/i);
	});

	it('should fetch time left to test start', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ time_left: 602 })
			})
		);

		const data = await getPreTestTimer('testUuid');
		expect(data).toEqual({ timeToBegin: 602 });

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/test/public/time_left/testUuid`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});
	});

	it('should throw error if fetch response is not ok', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: false
			})
		);
		const testUuid = 'testUuid';
		await expect(getPreTestTimer(testUuid)).rejects.toThrow(/failed\s+to\s+fetch/i);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/test/public/time_left/${testUuid}`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});
	});
});

describe('Fetch Questions using candidate', () => {
	const candidate_test_id = 24;
	const candidate_uuid = 'candidate_uuid';

	it('should throw error if candidate test id and uuid are not passed', async () => {
		await expect(getTestQuestions(null as any, '')).rejects.toThrow(/are\s+required/i);
	});

	it('should fetch test questions if candidate exists', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ time_left: 602 })
			})
		);

		const data = await getTestQuestions(candidate_test_id, candidate_uuid);
		expect(data).toEqual({ time_left: 602 });

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			`${BACKEND_URL}/candidate/test_questions/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`,
			{
				method: 'GET',
				headers: { accept: 'application/json' }
			}
		);
	});

	it('should throw error if fetch response is not ok', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: false
			})
		);

		await expect(getTestQuestions(candidate_test_id, candidate_uuid)).rejects.toThrow(
			/failed\s+to\s+fetch/i
		);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			`${BACKEND_URL}/candidate/test_questions/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`,
			{
				method: 'GET',
				headers: { accept: 'application/json' }
			}
		);
	});
});

describe('Fetch test timer', () => {
	const candidate_test_id = 24;
	const candidate_uuid = 'candidate_uuid';

	it('should throw error if candidate test id and uuid are not passed', async () => {
		await expect(getTimeLeft(null as any, '')).rejects.toThrow(/are\s+required/i);
	});

	it('should fetch time left for test timer if candidate exists', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ time_left: 2500 })
			})
		);

		const data = await getTimeLeft(candidate_test_id, candidate_uuid);
		expect(data).toEqual({ time_left: 2500 });

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			`${BACKEND_URL}/candidate/time_left/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`,
			{
				method: 'GET',
				headers: { accept: 'application/json' }
			}
		);
	});

	it('should throw error if timer is not fetched', async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: false
			})
		);

		await expect(getTimeLeft(candidate_test_id, candidate_uuid)).rejects.toThrow(
			/failed\s+to\s+fetch/i
		);

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			`${BACKEND_URL}/candidate/time_left/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`,
			{
				method: 'GET',
				headers: { accept: 'application/json' }
			}
		);
	});
});
