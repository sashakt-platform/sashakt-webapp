import { BACKEND_URL } from '$env/static/private';

export const getTestDetailsBySlug = async (slug: string) => {
	const apiEndpoint = `${BACKEND_URL}/test/public/${slug}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) throw new Error('Test is not available');

	const testData = await response.json();
	return { testData };
};

/**
 * Fetches test questions for a candidate
 * @param candidate_test_id - The candidate's test ID
 * @param candidate_uuid - The candidate's UUID
 * @returns Promise containing the test questions data
 */
export const getTestQuestions = async (candidate_test_id: number, candidate_uuid: string) => {
	if (!candidate_test_id || !candidate_uuid) {
		throw new Error('candidate_test_id and candidate_uuid are required');
	}
	const apiEndpoint = `${BACKEND_URL}/candidate/test_questions/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch test questions: ${response.status} ${response.statusText}`);
	}

	const testQuestions = await response.json();

	return testQuestions;
};

export const getTimeLeft = async (candidate_test_id: number, candidate_uuid: string) => {
	if (!candidate_test_id || !candidate_uuid) {
		throw new Error('candidate_test_id and candidate_uuid are required');
	}

	const apiEndpoint = `${BACKEND_URL}/candidate/time_left/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch test time: ${response.status} ${response.statusText}`);
	}

	return await response.json();
};
