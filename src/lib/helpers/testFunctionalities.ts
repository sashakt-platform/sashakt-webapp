import type { TCandidate, TQuestion, TSelection } from '$lib/types';
import { createTestSessionStore } from './testSession';

export const answeredAllMandatory = (
	answeredQuestions: TSelection[],
	allQuestions: TQuestion[]
) => {
	const mandatoryQuestionIds = allQuestions
		.filter((question) => question.is_mandatory)
		.map((question) => question.id);

	if (mandatoryQuestionIds.length === 0) return true;

	const answeredMandatoryQuestions = answeredQuestions.filter((selection) =>
		mandatoryQuestionIds.includes(selection.question_revision_id)
	);

	return answeredMandatoryQuestions.length === mandatoryQuestionIds.length;
};

export const createQuestionHandler = (
	questionId: number,
	candidate: TCandidate,
	selectedQuestions: TSelection[]
) => {
	const sessionStore = createTestSessionStore(candidate);

	const findSelectedQuestion = (questionId: number) => {
		return selectedQuestions.find((q) => q.question_revision_id === questionId);
	};

	const isOptionSelected = (optionId: number) => {
		const selected = findSelectedQuestion(questionId);
		return selected?.response.includes(optionId) ?? false;
	};

	const handleSelection = (response: number, question_type: string) => {
		let selected = findSelectedQuestion(questionId);

		if (selected) {
			if (question_type === 'single-choice') {
				selected.response = [response];
			} else {
				// Avoid duplicates
				if (!selected.response.includes(response)) {
					selected.response.push(response);
				}
			}
		} else {
			selectedQuestions.push({
				question_revision_id: questionId,
				response: [response],
				visited: true,
				time_spent: 0
			});
		}

		updateSession();
	};

	const removeOption = (response: number) => {
		const selected = findSelectedQuestion(questionId);

		if (selected) {
			selected.response = selected.response.filter((opt) => opt !== response);

			if (selected.response.length === 0) {
				selectedQuestions = selectedQuestions.filter((q) => q.question_revision_id !== questionId);
			}
		}

		updateSession();
	};

	const updateSession = () => {
		sessionStore.current = {
			...sessionStore.current,
			candidate,
			selections: [...selectedQuestions]
		};
	};

	const submitAnswer = async () => {
		try {
			const data = {
				...findSelectedQuestion(questionId),
				candidate
			};

			return await fetch('/api/submit-answer', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});
		} catch (error) {
			console.error('Failed to submit answer:', error);
			throw error;
		}
	};

	return {
		isOptionSelected,
		findSelectedQuestion,
		handleSelection,
		removeOption,
		submitAnswer
	};
};
