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

export const getTestQuestions = async (candidate_test_id: number, candidate_uuid: string) => {
	const apiEndpoint = `${BACKEND_URL}/candidate/test_questions/${candidate_test_id}/?candidate_uuid=${candidate_uuid}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) throw new Error('Test questions are not available');

	const testQuestions = await response.json();

	return testQuestions;
};
