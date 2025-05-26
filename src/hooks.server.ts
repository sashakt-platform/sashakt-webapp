import * as test from '$lib/server/test';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

export const handleTest: Handle = async function ({ event, resolve }) {
	if (event.route.id?.startsWith('/test')) {
		// we should check if slug exists
		if (!event.params.slug) {
			throw redirect(302, '/');
		}

		if (event.locals.testData) {
			// if test data is already loaded, no need to fetch again
			return resolve(event);
		}

		// get the data for the particular test
		try {
			const { testData } = await test.getTestDetailsBySlug(event.params.slug);
			event.locals.testData = testData;
		} catch (error) {
			throw redirect(302, '/');
		}
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleTest);
