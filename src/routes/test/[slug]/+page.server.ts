import { API_ENDPOINT, AUTHORIZATION } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const testData = await fetch(API_ENDPOINT + '/test/' + params.slug, {
		method: 'GET',
		headers: {
			accept: 'application/json',
			Authorization: AUTHORIZATION
		}
	});

	if (testData.status === 200) {
		return await testData.json();
	}

	error(404, 'Test is not available');
};
