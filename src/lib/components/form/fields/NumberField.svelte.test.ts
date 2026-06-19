import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NumberField from './NumberField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'number',
		label: 'Age',
		name: 'age',
		is_required: false,
		order: 1,
		...overrides
	};
}

const defaultProps = {
	value: undefined as unknown,
	onchange: vi.fn()
};

describe('NumberField rendering', () => {
	it('renders a number input', () => {
		render(NumberField, { props: { ...defaultProps, field: createField() } });
		const input = screen.getByRole('spinbutton');
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('type', 'number');
	});

	it('sets the id and name attributes from field', () => {
		render(NumberField, { props: { ...defaultProps, field: createField() } });
		const input = screen.getByRole('spinbutton');
		expect(input).toHaveAttribute('id', 'age');
		expect(input).toHaveAttribute('name', 'age');
	});

	it('sets the placeholder from field', () => {
		const field = createField({ placeholder: 'Enter your age' });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByPlaceholderText('Enter your age')).toBeInTheDocument();
	});

	it('renders empty placeholder when placeholder is null', () => {
		const field = createField({ placeholder: null });
		render(NumberField, { props: { ...defaultProps, field } });
		const input = screen.getByRole('spinbutton');
		expect(input).toHaveAttribute('placeholder', '');
	});

	it('marks input as required when is_required is true', () => {
		const field = createField({ is_required: true });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByRole('spinbutton')).toBeRequired();
	});

	it('does not mark input as required when is_required is false', () => {
		const field = createField({ is_required: false });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByRole('spinbutton')).not.toBeRequired();
	});
});

describe('NumberField value display', () => {
	it('displays the provided value', () => {
		render(NumberField, { props: { field: createField(), value: 25, onchange: vi.fn() } });
		expect(screen.getByRole('spinbutton')).toHaveValue(25);
	});

	it('falls back to default_value when value is null', () => {
		const field = createField({ default_value: '42' });
		render(NumberField, { props: { field, value: null, onchange: vi.fn() } });
		expect(screen.getByRole('spinbutton')).toHaveValue(42);
	});

	it('falls back to default_value when value is undefined', () => {
		const field = createField({ default_value: '10' });
		render(NumberField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('spinbutton')).toHaveValue(10);
	});

	it('renders empty when value and default_value are both absent', () => {
		render(NumberField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});
		const input = screen.getByRole('spinbutton') as HTMLInputElement;
		expect(input.value).toBe('');
	});

	it('prefers value over default_value', () => {
		const field = createField({ default_value: '99' });
		render(NumberField, { props: { field, value: 7, onchange: vi.fn() } });
		expect(screen.getByRole('spinbutton')).toHaveValue(7);
	});
});

describe('NumberField validation attributes', () => {
	it('sets min attribute from validation.min_value', () => {
		const field = createField({ validation: { min_value: 0 } });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '0');
	});

	it('sets max attribute from validation.max_value', () => {
		const field = createField({ validation: { max_value: 100 } });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '100');
	});

	it('sets both min and max attributes', () => {
		const field = createField({ validation: { min_value: 1, max_value: 50 } });
		render(NumberField, { props: { ...defaultProps, field } });
		const input = screen.getByRole('spinbutton');
		expect(input).toHaveAttribute('min', '1');
		expect(input).toHaveAttribute('max', '50');
	});

	it('does not set min/max when validation is null', () => {
		const field = createField({ validation: null });
		render(NumberField, { props: { ...defaultProps, field } });
		const input = screen.getByRole('spinbutton');
		expect(input).not.toHaveAttribute('min');
		expect(input).not.toHaveAttribute('max');
	});

	it('does not set min when min_value is null', () => {
		const field = createField({ validation: { min_value: null } });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByRole('spinbutton')).not.toHaveAttribute('min');
	});

	it('does not set max when max_value is null', () => {
		const field = createField({ validation: { max_value: null } });
		render(NumberField, { props: { ...defaultProps, field } });
		expect(screen.getByRole('spinbutton')).not.toHaveAttribute('max');
	});
});

describe('NumberField input handling', () => {
	it('calls onchange with a number when user types a value', async () => {
		const onchange = vi.fn();
		render(NumberField, { props: { field: createField(), value: undefined, onchange } });

		const input = screen.getByRole('spinbutton');
		await fireEvent.input(input, { target: { value: '42' } });

		expect(onchange).toHaveBeenCalledWith(42);
	});

	it('calls onchange with null when input is cleared', async () => {
		const onchange = vi.fn();
		render(NumberField, { props: { field: createField(), value: 10, onchange } });

		const input = screen.getByRole('spinbutton');
		await fireEvent.input(input, { target: { value: '' } });

		expect(onchange).toHaveBeenCalledWith(null);
	});

	it('calls onchange with 0 when user types zero', async () => {
		const onchange = vi.fn();
		render(NumberField, { props: { field: createField(), value: undefined, onchange } });

		const input = screen.getByRole('spinbutton');
		await fireEvent.input(input, { target: { value: '0' } });

		expect(onchange).toHaveBeenCalledWith(0);
	});

	it('calls onchange with a negative number', async () => {
		const onchange = vi.fn();
		render(NumberField, { props: { field: createField(), value: undefined, onchange } });

		const input = screen.getByRole('spinbutton');
		await fireEvent.input(input, { target: { value: '-5' } });

		expect(onchange).toHaveBeenCalledWith(-5);
	});

	it('calls onchange with a decimal number', async () => {
		const onchange = vi.fn();
		render(NumberField, { props: { field: createField(), value: undefined, onchange } });

		const input = screen.getByRole('spinbutton');
		await fireEvent.input(input, { target: { value: '3.14' } });

		expect(onchange).toHaveBeenCalledWith(3.14);
	});

	it('calls onchange on each input event', async () => {
		const onchange = vi.fn();
		render(NumberField, { props: { field: createField(), value: undefined, onchange } });

		const input = screen.getByRole('spinbutton');
		await fireEvent.input(input, { target: { value: '1' } });
		await fireEvent.input(input, { target: { value: '12' } });
		await fireEvent.input(input, { target: { value: '123' } });

		expect(onchange).toHaveBeenCalledTimes(3);
		expect(onchange).toHaveBeenNthCalledWith(1, 1);
		expect(onchange).toHaveBeenNthCalledWith(2, 12);
		expect(onchange).toHaveBeenNthCalledWith(3, 123);
	});
});
