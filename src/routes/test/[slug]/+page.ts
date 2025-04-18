import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	// check if test is valid
	// params.slug will have unique test identifier
	let testFound = true;
	const start_instructions = [
		{
			title: 'General Instructions',
			points: [
				'1. All questions are mandatory.',
				'2. Must be finished in a single attempt. Multiple attempts are not allowed.',
				'3. Will not allow to submit without attempting any questions.',
				'4. The countdown timer in the top right corner of the screen will display the remaining time available for you to complete the test. When the timer reaches zero, the test will end automatically. '
			]
		},
		{
			title: 'NAVIGATING & ANSWERING QUESTIONS',
			points: [
				'To select an answer, click on the button of one of the options.',
				'To change your selected answer, click on the button of another option.',
				'Click on the question number to access the question palette, where you can select and navigate between different questions.',
				'Use the arrow keys to move between questions, back and forth. You can also skip a question and return to it later to provide your answer.'
			]
		}
	];
	if (testFound) {
		return {
			name: 'Test name',
			description: 'Test description',
			start_time: '2025-04-15T14:00:00.177Z',
			end_time: '2025-04-14T15:00:00.177Z',
			time_limit: 3600,
			completion_message: 'Thank you for completing the test',
			start_instructions,
			no_of_questions: 0,
			total_marks: 20
		};
	}

	error(404, 'Not found');
};
