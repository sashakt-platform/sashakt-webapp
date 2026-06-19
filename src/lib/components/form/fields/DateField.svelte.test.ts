import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DateField from './DateField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'date',
		label: 'Date of Birth',
		name: 'dob',
		is_required: false,
		order: 1,
		...overrides
	};
}

describe('DateField rendering', () => {
	it('renders a date input', () => {
		render(DateField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		const input = document.querySelector('input[type="date"]');
		expect(input).toBeInTheDocument();
	});

	it('sets id and name from field', () => {
		render(DateField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		const input = document.querySelector('input[type="date"]');
		expect(input).toHaveAttribute('id', 'dob');
		expect(input).toHaveAttribute('name', 'dob');
	});

	it('marks input as required when is_required is true', () => {
		render(DateField, {
			props: { field: createField({ is_required: true }), value: undefined, onchange: vi.fn() }
		});
		expect(document.querySelector('input[type="date"]')).toBeRequired();
	});

	it('does not mark input as required when is_required is false', () => {
		render(DateField, {
			props: { field: createField({ is_required: false }), value: undefined, onchange: vi.fn() }
		});
		expect(document.querySelector('input[type="date"]')).not.toBeRequired();
	});

	it('renders a calendar icon button', () => {
		render(DateField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('button', { name: 'Open date picker' })).toBeInTheDocument();
	});
});

describe('DateField value display', () => {
	it('displays the provided value', () => {
		render(DateField, {
			props: { field: createField(), value: '2000-05-15', onchange: vi.fn() }
		});
		expect(document.querySelector('input[type="date"]')).toHaveValue('2000-05-15');
	});

	it('falls back to default_value when value is null', () => {
		const field = createField({ default_value: '1990-01-01' });
		render(DateField, { props: { field, value: null, onchange: vi.fn() } });
		expect(document.querySelector('input[type="date"]')).toHaveValue('1990-01-01');
	});

	it('renders empty when value and default_value are both absent', () => {
		render(DateField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(document.querySelector('input[type="date"]')).toHaveValue('');
	});

	it('prefers value over default_value', () => {
		const field = createField({ default_value: '1990-01-01' });
		render(DateField, { props: { field, value: '2024-12-25', onchange: vi.fn() } });
		expect(document.querySelector('input[type="date"]')).toHaveValue('2024-12-25');
	});
});

describe('DateField input handling', () => {
	it('calls onchange with the selected date value', async () => {
		const onchange = vi.fn();
		render(DateField, { props: { field: createField(), value: '', onchange } });

		const input = document.querySelector('input[type="date"]')!;
		await fireEvent.input(input, { target: { value: '2025-06-19' } });

		expect(onchange).toHaveBeenCalledWith('2025-06-19');
	});

	it('calls onchange with empty string when date is cleared', async () => {
		const onchange = vi.fn();
		render(DateField, {
			props: { field: createField(), value: '2025-01-01', onchange }
		});

		const input = document.querySelector('input[type="date"]')!;
		await fireEvent.input(input, { target: { value: '' } });

		expect(onchange).toHaveBeenCalledWith('');
	});
});

describe('DateField calendar button', () => {
	it('calls showPicker on the input when calendar button is clicked', async () => {
		render(DateField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });

		const input = document.querySelector('input[type="date"]') as HTMLInputElement;
		input.showPicker = vi.fn();

		await fireEvent.click(screen.getByRole('button', { name: 'Open date picker' }));

		expect(input.showPicker).toHaveBeenCalled();
	});

	it('falls back to focus when showPicker throws', async () => {
		render(DateField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });

		const input = document.querySelector('input[type="date"]') as HTMLInputElement;
		input.showPicker = vi.fn(() => {
			throw new Error('Not supported');
		});
		const focusSpy = vi.spyOn(input, 'focus');

		await fireEvent.click(screen.getByRole('button', { name: 'Open date picker' }));

		expect(focusSpy).toHaveBeenCalled();
	});
});
