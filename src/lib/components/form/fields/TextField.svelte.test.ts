import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TextField from './TextField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'text',
		label: 'Name',
		name: 'full_name',
		is_required: false,
		order: 1,
		...overrides
	};
}

describe('TextField rendering', () => {
	it('renders a text input by default', () => {
		render(TextField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		const input = screen.getByRole('textbox');
		expect(input).toHaveAttribute('type', 'text');
	});

	it('renders with email type when inputType is email', () => {
		render(TextField, {
			props: { field: createField(), value: undefined, onchange: vi.fn(), inputType: 'email' }
		});
		const input = document.querySelector('input[type="email"]');
		expect(input).toBeInTheDocument();
	});

	it('renders with tel type when inputType is tel', () => {
		render(TextField, {
			props: { field: createField(), value: undefined, onchange: vi.fn(), inputType: 'tel' }
		});
		const input = document.querySelector('input[type="tel"]');
		expect(input).toBeInTheDocument();
	});

	it('sets id and name from field', () => {
		render(TextField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		const input = screen.getByRole('textbox');
		expect(input).toHaveAttribute('id', 'full_name');
		expect(input).toHaveAttribute('name', 'full_name');
	});

	it('sets placeholder from field', () => {
		const field = createField({ placeholder: 'Enter name' });
		render(TextField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
	});

	it('renders empty placeholder when placeholder is null', () => {
		render(TextField, {
			props: { field: createField({ placeholder: null }), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '');
	});

	it('marks input as required when is_required is true', () => {
		render(TextField, {
			props: { field: createField({ is_required: true }), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('textbox')).toBeRequired();
	});
});

describe('TextField value display', () => {
	it('displays the provided value', () => {
		render(TextField, { props: { field: createField(), value: 'John', onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('John');
	});

	it('falls back to default_value when value is null', () => {
		const field = createField({ default_value: 'Default' });
		render(TextField, { props: { field, value: null, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('Default');
	});

	it('renders empty when value and default_value are both absent', () => {
		render(TextField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('');
	});

	it('prefers value over default_value', () => {
		const field = createField({ default_value: 'Default' });
		render(TextField, { props: { field, value: 'Actual', onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveValue('Actual');
	});
});

describe('TextField validation attributes', () => {
	it('sets minlength from validation', () => {
		const field = createField({ validation: { min_length: 3 } });
		render(TextField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveAttribute('minlength', '3');
	});

	it('sets maxlength from validation', () => {
		const field = createField({ validation: { max_length: 50 } });
		render(TextField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '50');
	});

	it('sets pattern from validation', () => {
		const field = createField({ validation: { pattern: '[A-Za-z]+' } });
		render(TextField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
	});

	it('does not set validation attributes when validation is null', () => {
		render(TextField, {
			props: { field: createField({ validation: null }), value: undefined, onchange: vi.fn() }
		});
		const input = screen.getByRole('textbox');
		expect(input).not.toHaveAttribute('minlength');
		expect(input).not.toHaveAttribute('maxlength');
		expect(input).not.toHaveAttribute('pattern');
	});
});

describe('TextField input handling', () => {
	it('calls onchange with the input value on typing', async () => {
		const onchange = vi.fn();
		render(TextField, { props: { field: createField(), value: '', onchange } });

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Hello' } });

		expect(onchange).toHaveBeenCalledWith('Hello');
	});

	it('calls onchange with empty string when input is cleared', async () => {
		const onchange = vi.fn();
		render(TextField, { props: { field: createField(), value: 'Hi', onchange } });

		await fireEvent.input(screen.getByRole('textbox'), { target: { value: '' } });

		expect(onchange).toHaveBeenCalledWith('');
	});

	it('calls onchange on each input event', async () => {
		const onchange = vi.fn();
		render(TextField, { props: { field: createField(), value: '', onchange } });

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'a' } });
		await fireEvent.input(input, { target: { value: 'ab' } });
		await fireEvent.input(input, { target: { value: 'abc' } });

		expect(onchange).toHaveBeenCalledTimes(3);
		expect(onchange).toHaveBeenNthCalledWith(1, 'a');
		expect(onchange).toHaveBeenNthCalledWith(2, 'ab');
		expect(onchange).toHaveBeenNthCalledWith(3, 'abc');
	});
});
