import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TextareaField from './TextareaField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'textarea',
		label: 'Comments',
		name: 'comments',
		is_required: false,
		order: 1,
		...overrides
	};
}

describe('TextareaField rendering', () => {
	it('renders a textarea element', () => {
		render(TextareaField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toBeInTheDocument();
		expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
	});

	it('sets id and name from field', () => {
		render(TextareaField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		const textarea = screen.getByRole('textbox');
		expect(textarea).toHaveAttribute('id', 'comments');
		expect(textarea).toHaveAttribute('name', 'comments');
	});

	it('sets placeholder from field', () => {
		const field = createField({ placeholder: 'Write here...' });
		render(TextareaField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByPlaceholderText('Write here...')).toBeInTheDocument();
	});

	it('renders empty placeholder when placeholder is null', () => {
		render(TextareaField, {
			props: { field: createField({ placeholder: null }), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '');
	});

	it('marks textarea as required when is_required is true', () => {
		render(TextareaField, {
			props: { field: createField({ is_required: true }), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('textbox')).toBeRequired();
	});

	it('does not mark textarea as required when is_required is false', () => {
		render(TextareaField, {
			props: { field: createField({ is_required: false }), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('textbox')).not.toBeRequired();
	});
});

describe('TextareaField value display', () => {
	it('displays the provided value', () => {
		render(TextareaField, { props: { field: createField(), value: 'Hello', onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('Hello');
	});

	it('falls back to default_value when value is null', () => {
		const field = createField({ default_value: 'Default text' });
		render(TextareaField, { props: { field, value: null, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('Default text');
	});

	it('renders empty when value and default_value are both absent', () => {
		render(TextareaField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('');
	});

	it('prefers value over default_value', () => {
		const field = createField({ default_value: 'Default' });
		render(TextareaField, { props: { field, value: 'Actual', onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('Actual');
	});
});

describe('TextareaField validation attributes', () => {
	it('sets minlength from validation', () => {
		const field = createField({ validation: { min_length: 10 } });
		render(TextareaField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveAttribute('minlength', '10');
	});

	it('sets maxlength from validation', () => {
		const field = createField({ validation: { max_length: 500 } });
		render(TextareaField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '500');
	});

	it('does not set validation attributes when validation is null', () => {
		render(TextareaField, {
			props: { field: createField({ validation: null }), value: undefined, onchange: vi.fn() }
		});
		const textarea = screen.getByRole('textbox');
		expect(textarea).not.toHaveAttribute('minlength');
		expect(textarea).not.toHaveAttribute('maxlength');
	});
});

describe('TextareaField input handling', () => {
	it('calls onchange with the input value on typing', async () => {
		const onchange = vi.fn();
		render(TextareaField, { props: { field: createField(), value: '', onchange } });

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'New text' } });

		expect(onchange).toHaveBeenCalledWith('New text');
	});

	it('calls onchange with empty string when cleared', async () => {
		const onchange = vi.fn();
		render(TextareaField, { props: { field: createField(), value: 'Some text', onchange } });

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: '' } });

		expect(onchange).toHaveBeenCalledWith('');
	});

	it('calls onchange on each input event', async () => {
		const onchange = vi.fn();
		render(TextareaField, { props: { field: createField(), value: '', onchange } });

		const textarea = screen.getByRole('textbox');
		await fireEvent.input(textarea, { target: { value: 'a' } });
		await fireEvent.input(textarea, { target: { value: 'ab' } });

		expect(onchange).toHaveBeenCalledTimes(2);
		expect(onchange).toHaveBeenNthCalledWith(1, 'a');
		expect(onchange).toHaveBeenNthCalledWith(2, 'ab');
	});
});
