import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import * as test from '$lib/server/test';

export const handleTest: Handle = async function ({ event, resolve }) {
	if (event.route.id?.startsWith('/test')) {
		// we should check if slug exists
		if (!event.params.slug) {
			throw redirect(302, '/');
		}

		// get the data for the particular test
		const { testData } = test.getTestBySlug(event.params.slug);

		if (!testData) {
			throw redirect(302, '/');
		}

		event.locals.testData = testData;
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleTest);
