import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DynamicForm from './DynamicForm.svelte';
import type { TForm, TFormField } from '$lib/types';

vi.stubGlobal('fetch', vi.fn());

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'text',
		label: 'Full Name',
		name: 'full_name',
		is_required: false,
		order: 1,
		...overrides
	};
}

function createForm(fields: TFormField[], overrides: Partial<TForm> = {}): TForm {
	return {
		id: 1,
		name: 'Registration Form',
		description: null,
		fields,
		...overrides
	};
}

const testDetails = { id: 42, name: 'Sample Test' };

describe('DynamicForm rendering', () => {
	it('renders the form name as heading', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()]), testDetails }
		});
		expect(screen.getByText('Registration Form')).toBeInTheDocument();
	});

	it('renders form description when provided', () => {
		const form = createForm([createField()], { description: 'Please fill in your details' });
		render(DynamicForm, { props: { form, testDetails } });
		expect(screen.getByText('Please fill in your details')).toBeInTheDocument();
	});

	it('does not render description when null', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()], { description: null }), testDetails }
		});
		expect(screen.queryByText('Please fill in your details')).not.toBeInTheDocument();
	});

	it('renders all form fields', () => {
		const fields = [
			createField({ id: 1, name: 'full_name', label: 'Full Name', order: 1 }),
			createField({ id: 2, name: 'email', label: 'Email', field_type: 'email', order: 2 })
		];
		render(DynamicForm, { props: { form: createForm(fields), testDetails } });
		expect(screen.getByText('Full Name')).toBeInTheDocument();
		expect(screen.getByText('Email')).toBeInTheDocument();
	});

	it('renders fields sorted by order', () => {
		const fields = [
			createField({ id: 2, name: 'email', label: 'Email', order: 2 }),
			createField({ id: 1, name: 'full_name', label: 'Full Name', order: 1 })
		];
		render(DynamicForm, { props: { form: createForm(fields), testDetails } });
		const labels = screen.getAllByText(/Full Name|Email/);
		expect(labels[0]).toHaveTextContent('Full Name');
		expect(labels[1]).toHaveTextContent('Email');
	});

	it('renders Continue to Test button', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()]), testDetails }
		});
		expect(screen.getByText(/Continue to Test/)).toBeInTheDocument();
	});

	it('renders a submit button when onContinue is not provided', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()]), testDetails }
		});
		expect(screen.getByRole('button', { name: /Continue to Test/ })).toBeInTheDocument();
	});

	it('renders a button when onContinue is provided', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()]), testDetails, onContinue: vi.fn() }
		});
		expect(screen.getByRole('button', { name: /Continue to Test/ })).toBeInTheDocument();
	});
});

describe('DynamicForm validation', () => {
	it('shows required field error when submitting empty required field', async () => {
		const field = createField({ is_required: true, label: 'Full Name', name: 'full_name' });
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(screen.getByText('Full Name is required')).toBeInTheDocument();
		expect(onContinue).not.toHaveBeenCalled();
	});

	it('shows error for invalid email format', async () => {
		const field = createField({
			field_type: 'email',
			label: 'Email',
			name: 'email',
			is_required: false
		});
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'not-an-email' } });
		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
		expect(onContinue).not.toHaveBeenCalled();
	});

	it('shows min length error when value is too short', async () => {
		const field = createField({
			label: 'Full Name',
			name: 'full_name',
			validation: { min_length: 5, max_length: null }
		});
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Hi' } });
		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(screen.getByText('Full Name must be at least 5 characters')).toBeInTheDocument();
	});

	it('shows max length error when value is too long', async () => {
		const field = createField({
			label: 'Full Name',
			name: 'full_name',
			validation: { min_length: null, max_length: 5 }
		});
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'Too Long Name' } });
		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(screen.getByText('Full Name must be at most 5 characters')).toBeInTheDocument();
	});

	it('uses custom error message from field config when provided', async () => {
		const field = createField({
			is_required: true,
			label: 'Full Name',
			name: 'full_name',
			validation: { custom_error_message: 'Please enter your full name' }
		});
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(screen.getByText('Please enter your full name')).toBeInTheDocument();
	});

	it('clears validation error when field value changes', async () => {
		const field = createField({ is_required: true, label: 'Full Name', name: 'full_name' });
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));
		expect(screen.getByText('Full Name is required')).toBeInTheDocument();

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'John' } });

		expect(screen.queryByText('Full Name is required')).not.toBeInTheDocument();
	});

	it('shows errors for multiple invalid fields at once', async () => {
		const fields = [
			createField({ id: 1, name: 'full_name', label: 'Full Name', is_required: true, order: 1 }),
			createField({ id: 2, name: 'email', label: 'Email', field_type: 'email', is_required: true, order: 2 })
		];
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm(fields), testDetails, onContinue }
		});

		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(screen.getByText('Full Name is required')).toBeInTheDocument();
		expect(screen.getByText('Email is required')).toBeInTheDocument();
	});
});

describe('DynamicForm onContinue', () => {
	it('calls onContinue with form responses when valid', async () => {
		const field = createField({ is_required: false, name: 'full_name' });
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'John Doe' } });
		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(onContinue).toHaveBeenCalledWith({ full_name: 'John Doe' });
	});

	it('does not call onContinue when required fields are empty', async () => {
		const field = createField({ is_required: true, name: 'full_name', label: 'Full Name' });
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(onContinue).not.toHaveBeenCalled();
	});

	it('calls onContinue with empty object when form has no required fields and nothing entered', async () => {
		const field = createField({ is_required: false, name: 'full_name' });
		const onContinue = vi.fn();
		render(DynamicForm, {
			props: { form: createForm([field]), testDetails, onContinue }
		});

		await fireEvent.click(screen.getByRole('button', { name: /Continue to Test/ }));

		expect(onContinue).toHaveBeenCalledWith({});
	});
});

describe('DynamicForm validation hints', () => {
	it('shows character range hint when both min and max length set', () => {
		const field = createField({
			validation: { min_length: 5, max_length: 100 }
		});
		render(DynamicForm, { props: { form: createForm([field]), testDetails } });
		expect(screen.getByText('5-100 characters')).toBeInTheDocument();
	});

	it('shows max length hint when only max length set', () => {
		const field = createField({
			validation: { min_length: null, max_length: 50 }
		});
		render(DynamicForm, { props: { form: createForm([field]), testDetails } });
		expect(screen.getByText('Up to 50 characters')).toBeInTheDocument();
	});

	it('shows min length hint when only min length set', () => {
		const field = createField({
			validation: { min_length: 3, max_length: null }
		});
		render(DynamicForm, { props: { form: createForm([field]), testDetails } });
		expect(screen.getByText('At least 3 characters')).toBeInTheDocument();
	});

	it('shows no hint when no length validation set', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()]), testDetails }
		});
		expect(screen.queryByText(/characters/)).not.toBeInTheDocument();
	});
});

describe('DynamicForm submit error', () => {
	beforeEach(() => {
		vi.mocked(fetch).mockReset();
	});

	it('does not show submit error initially', () => {
		render(DynamicForm, {
			props: { form: createForm([createField()]), testDetails }
		});
		expect(screen.queryByText(/error occurred/i)).not.toBeInTheDocument();
	});
});
