import { BACKEND_URL } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const name = url.searchParams.get('name') || '';
	const stateIds = url.searchParams.get('state_ids') || '';
	const testId = url.searchParams.get('test_id') || '';

	try {
		const params = new URLSearchParams({ page: '1', size: '50' });
		if (name) params.set('name', name);
		if (stateIds) params.set('state_ids', stateIds);
		if (testId) params.set('test_id', testId);

		const response = await fetch(`${BACKEND_URL}/location/district/?${params.toString()}`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});

		if (!response.ok) {
			return json({ items: [] }, { status: response.status });
		}

		const data = await response.json();
		return json({ items: data.items || [] });
	} catch (error) {
		console.error('Error searching districts:', error);
		return json({ items: [] }, { status: 500 });
	}
};
