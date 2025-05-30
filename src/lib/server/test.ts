import { API_ENDPOINT } from '$env/static/private';

export const getTestDetailsBySlug = async (slug: string) => {

	// TODO: we should first check if the data exists in the localstorage
	// if yes, then return data
	// else make actual call to backend
	// TODO: This to be replaced by actual call to the backend
	const apiEndpoint = `${API_ENDPOINT}/test/public/${slug}`;

	const response = await fetch(apiEndpoint, {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	if (!response.ok) throw new Error('Test is not available');

	const testData = await response.json();
	return { testData };
};
