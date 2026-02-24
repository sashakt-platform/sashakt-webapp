import { BACKEND_URL } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const name = url.searchParams.get('name') || '';
	const entityTypeId = url.searchParams.get('entity_type_id') || '';
	const testId = url.searchParams.get('test_id') || '';

	try {
		const params = new URLSearchParams({ page: '1', size: '50', sort_order: 'asc' });
		if (name) params.set('name', name);
		if (entityTypeId) params.set('entity_type_id', entityTypeId);
		if (testId) params.set('test_id', testId);

		const response = await fetch(`${BACKEND_URL}/entity/?${params.toString()}`, {
			method: 'GET',
			headers: { accept: 'application/json' }
		});

		if (!response.ok) {
			return json({ items: [] }, { status: response.status });
		}

		const data = await response.json();
		return json({ items: data.items || [] });
	} catch (error) {
		console.error('Error searching entities:', error);
		return json({ items: [] }, { status: 500 });
	}
};
