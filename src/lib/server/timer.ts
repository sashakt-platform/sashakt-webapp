import { BACKEND_URL } from '$env/static/private';

/**
 * Fetches remaining time for a candidate test (in-test timer)
 * @param candidate_test_id - The candidate's test ID
 * @param candidate_uuid - The candidate's UUID
 * @returns Promise containing time_left in seconds
 */
export const getCandidateTestTimeLeft = async (candidate_test_id: number, candidate_uuid: string) => {
	if (!candidate_test_id || !candidate_uuid) {
		throw new Error('candidate_test_id and candidate_uuid are required');
	}
	
	const apiEndpoint = `${BACKEND_URL}/candidate/time_left/${candidate_test_id}?candidate_uuid=${candidate_uuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch timer: ${response.status} ${response.statusText}`);
	}

	const timerData = await response.json();
	return timerData;
};

/**
 * Fetches time before test starts (pre-test timer) 
 * @param test_uuid - The test's UUID/link
 * @returns Promise containing time_left in seconds
 */
export const getPreTestTimeLeft = async (test_uuid: string) => {
	if (!test_uuid) {
		throw new Error('test_uuid is required');
	}
	
	const apiEndpoint = `${BACKEND_URL}/test/public/time_left/${test_uuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch pre-test timer: ${response.status} ${response.statusText}`);
	}

	const timerData = await response.json();
	return timerData;
}; 