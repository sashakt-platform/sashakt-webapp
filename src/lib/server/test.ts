import { BACKEND_URL } from '$env/static/private';

export type TState = {
	id: number;
	name: string;
};

export type TDistrict = {
	id: number;
	name: string;
	state_id: number;
};

export type TBlock = {
	id: number;
	name: string;
	district_id: number;
};

export type TLocations = {
	states: TState[];
	districts: TDistrict[];
	blocks: TBlock[];
};

/**
 * Fetches all states from the backend
 */
export const getStates = async (): Promise<TState[]> => {
	try {
		const response = await fetch(`${BACKEND_URL}/location/state/?page=1&size=100`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});

		if (!response.ok) {
			console.error('Failed to fetch states:', response.status, response.statusText);
			return [];
		}

		const data = await response.json();
		return data.items || [];
	} catch (error) {
		console.error('Error fetching states:', error);
		return [];
	}
};

/**
 * Fetches all districts from the backend
 */
export const getDistricts = async (): Promise<TDistrict[]> => {
	try {
		const response = await fetch(`${BACKEND_URL}/location/district/?page=1&size=100`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});

		if (!response.ok) {
			console.error('Failed to fetch districts:', response.status, response.statusText);
			return [];
		}

		const data = await response.json();
		return data.items || [];
	} catch (error) {
		console.error('Error fetching districts:', error);
		return [];
	}
};

/**
 * Fetches all blocks from the backend
 */
export const getBlocks = async (): Promise<TBlock[]> => {
	try {
		const response = await fetch(`${BACKEND_URL}/location/block/?page=1&size=100`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});

		if (!response.ok) {
			console.error('Failed to fetch blocks:', response.status, response.statusText);
			return [];
		}

		const data = await response.json();
		return data.items || [];
	} catch (error) {
		console.error('Error fetching blocks:', error);
		return [];
	}
};

/**
 * Fetches all locations (states, districts, blocks) in parallel
 */
export const getLocations = async (): Promise<TLocations> => {
	const [states, districts, blocks] = await Promise.all([getStates(), getDistricts(), getBlocks()]);

	return { states, districts, blocks };
};

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

export const getPreTestTimer = async (testUuid: string) => {
	if (!testUuid) {
		throw new Error('Test UUID is required');
	}

	const apiEndpoint = `${BACKEND_URL}/test/public/time_left/${testUuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) throw new Error('failed to fetch pre-test timer');

	const data = await response.json();
	return { timeToBegin: data.time_left };
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
