import QuestionCard from '$lib/components/QuestionCard.svelte';
import { render, screen } from '@testing-library/svelte';

const mockProps = {
	question: {
		id: 3,
		question_text: 'string',
		options: [
			{ id: 1, key: 'A', value: 'value 1' },
			{ id: 2, key: 'B', value: 'value 2' },
			{ id: 3, key: 'C', value: 'value 3' },
			{ id: 4, key: 'D', value: 'value 4' }
		],
		is_mandatory: true
	},
	serialNumber: 2,
	totalQuestions: 1,
	selectedQuestions: []
};

const label = `${mockProps.question.options[0].key}. ${mockProps.question.options[0].value}`;

describe('Question Card', () => {
	it('should render question details', () => {
		render(QuestionCard, { props: mockProps });

		expect(screen.getByText(mockProps.serialNumber)).toBeInTheDocument();
		expect(screen.getByText(/of 1/i)).toBeInTheDocument();
		expect(screen.getByText(mockProps.question.question_text)).toBeInTheDocument();
		expect(screen.getByTestId('mandatory')).toBeInTheDocument();

		expect(screen.getByLabelText(label)).toBeInTheDocument();
	});

	it('should not mark question as mandatory', () => {
		const props = {
			...mockProps,
			question: {
				...mockProps.question,
				is_mandatory: false
			}
		};
		render(QuestionCard, { props });

		expect(screen.queryByTestId('mandatory')).not.toBeInTheDocument();
	});
});
