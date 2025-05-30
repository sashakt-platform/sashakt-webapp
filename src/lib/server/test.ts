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
