import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CheckboxField from './CheckboxField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'checkbox',
		label: 'Agree to terms',
		name: 'agree',
		is_required: false,
		order: 1,
		...overrides
	};
}

describe('CheckboxField rendering', () => {
	it('renders a checkbox', () => {
		render(CheckboxField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('checkbox')).toBeInTheDocument();
	});

	it('sets id from field name', () => {
		render(CheckboxField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'agree');
	});
});

describe('CheckboxField initial state', () => {
	it('is checked when value is true', () => {
		render(CheckboxField, {
			props: { field: createField(), value: true, onchange: vi.fn() }
		});
		expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
	});

	it('is unchecked when value is false', () => {
		render(CheckboxField, {
			props: { field: createField(), value: false, onchange: vi.fn() }
		});
		expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'unchecked');
	});

	it('uses default_value "true" when value is undefined', () => {
		const field = createField({ default_value: 'true' });
		render(CheckboxField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'checked');
	});

	it('is unchecked when default_value is not "true" and value is undefined', () => {
		const field = createField({ default_value: 'false' });
		render(CheckboxField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'unchecked');
	});

	it('is unchecked when both value and default_value are absent', () => {
		render(CheckboxField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});
		expect(screen.getByRole('checkbox')).toHaveAttribute('data-state', 'unchecked');
	});
});

describe('CheckboxField toggle behaviour', () => {
	it('calls onchange with true when checked', async () => {
		const onchange = vi.fn();
		render(CheckboxField, {
			props: { field: createField(), value: false, onchange }
		});

		await fireEvent.click(screen.getByRole('checkbox'));

		expect(onchange).toHaveBeenCalledWith(true);
	});

	it('calls onchange with false when unchecked', async () => {
		const onchange = vi.fn();
		render(CheckboxField, {
			props: { field: createField(), value: true, onchange }
		});

		await fireEvent.click(screen.getByRole('checkbox'));

		expect(onchange).toHaveBeenCalledWith(false);
	});

	it('toggles visual state on click', async () => {
		render(CheckboxField, {
			props: { field: createField(), value: false, onchange: vi.fn() }
		});

		const checkbox = screen.getByRole('checkbox');
		expect(checkbox).toHaveAttribute('data-state', 'unchecked');

		await fireEvent.click(checkbox);

		expect(checkbox).toHaveAttribute('data-state', 'checked');
	});
});
