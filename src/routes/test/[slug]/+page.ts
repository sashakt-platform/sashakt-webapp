import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	// check if test is valid
	// params.slug will have unique test identifier
	let testFound = true;

	if (testFound) {
		return {
			name: 'Test name',
			description: 'Test description',
			start_time: '2025-04-15T14:00:00.177Z',
			end_time: '2025-04-14T15:00:00.177Z',
			time_limit: 3600,
			completion_message: 'Thank you for completing the test',
			start_instructions: 'Please read the instructions carefully',
			no_of_questions: 0
		};
	}

	error(404, 'Not found');
};
