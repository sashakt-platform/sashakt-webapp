import { BACKEND_URL } from '$env/static/private';
import { normalizeFeedbackEntry, type TFeedbackEntry } from '$lib/helpers/feedbackHelpers';

export type TState = {
	id: number;
	name: string;
};

/**
 * Fetches all states from the backend
 */
export const getStates = async (testId: number): Promise<TState[]> => {
	try {
		const response = await fetch(
			`${BACKEND_URL}/location/state/?test_id=${testId}&page=1&size=100`,
			{
				method: 'GET',
				headers: { accept: 'application/json' }
			}
		);

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
export const getTestQuestions = async (
	candidate_test_id: number,
	candidate_uuid: string,
	useOmr?: string
) => {
	if (!candidate_test_id || !candidate_uuid) {
		throw new Error('candidate_test_id and candidate_uuid are required');
	}
	let apiEndpoint = `${BACKEND_URL}/candidate/test_questions/${candidate_test_id}?candidate_uuid=${candidate_uuid}`;

	if (useOmr) {
		apiEndpoint += `&use_omr=${useOmr}`;
	}

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

/**
 * The answer review and question data a submitted result page needs.
 *
 * Needed by the submit action and by a plain reload of an already-submitted
 * test, so both show the same page. Returns nulls rather than throwing: the
 * result is still worth showing if the review payload cannot be fetched.
 */
export const getSubmittedResultExtras = async (
	candidate_test_id: number,
	candidate_uuid: string,
	// The caller's event fetch, so this keeps using the same fetch the inline
	// version did rather than silently switching to the global one.
	eventFetch: typeof fetch = fetch
): Promise<{ feedback: TFeedbackEntry[] | null; testQuestions: unknown | null }> => {
	try {
		const [feedbackResponse, testQuestions] = await Promise.all([
			eventFetch(
				`${BACKEND_URL}/candidate/${candidate_test_id}/review-feedback?candidate_uuid=${candidate_uuid}`,
				{ method: 'GET', headers: { accept: 'application/json' } }
			),
			getTestQuestions(candidate_test_id, candidate_uuid)
		]);

		if (!feedbackResponse.ok) return { feedback: null, testQuestions };

		const feedbackData = await feedbackResponse.json();
		return { feedback: feedbackData.map(normalizeFeedbackEntry), testQuestions };
	} catch (error) {
		console.error('Error fetching feedback:', error);
		return { feedback: null, testQuestions: null };
	}
};

export const getTimeLeft = async (candidate_test_id: number, candidate_uuid: string) => {
	if (!candidate_test_id || !candidate_uuid) {
		throw new Error('candidate_test_id and candidate_uuid are required');
	}

	const apiEndpoint = `${BACKEND_URL}/candidate/time_left/${candidate_test_id}?candidate_uuid=${candidate_uuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch test time: ${response.status} ${response.statusText}`);
	}

	return await response.json();
};
