import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RadioField from './RadioField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'radio',
		label: 'Gender',
		name: 'gender',
		is_required: false,
		order: 1,
		options: [
			{ id: 1, label: 'Male', value: 'male' },
			{ id: 2, label: 'Female', value: 'female' },
			{ id: 3, label: 'Other', value: 'other' }
		],
		...overrides
	};
}

describe('RadioField rendering', () => {
	it('renders all option labels', () => {
		render(RadioField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByText('Male')).toBeInTheDocument();
		expect(screen.getByText('Female')).toBeInTheDocument();
		expect(screen.getByText('Other')).toBeInTheDocument();
	});

	it('renders letter labels A, B, C for each option', () => {
		render(RadioField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByText('A')).toBeInTheDocument();
		expect(screen.getByText('B')).toBeInTheDocument();
		expect(screen.getByText('C')).toBeInTheDocument();
	});

	it('renders nothing when options is null', () => {
		const { container } = render(RadioField, {
			props: { field: createField({ options: null }), value: undefined, onchange: vi.fn() }
		});
		expect(container.querySelectorAll('button[role="radio"]').length).toBe(0);
	});

	it('renders nothing when options is empty', () => {
		const { container } = render(RadioField, {
			props: { field: createField({ options: [] }), value: undefined, onchange: vi.fn() }
		});
		expect(container.querySelectorAll('button[role="radio"]').length).toBe(0);
	});
});

describe('RadioField selection', () => {
	it('pre-selects the option matching the initial value', () => {
		const { container } = render(RadioField, {
			props: { field: createField(), value: 'female', onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(1);
	});

	it('uses default_value when value is undefined', () => {
		const field = createField({ default_value: 'other' });
		const { container } = render(RadioField, {
			props: { field, value: undefined, onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(1);
	});

	it('no option is highlighted when value and default_value are both absent', () => {
		const { container } = render(RadioField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(0);
	});

	it('calls onchange with the option value when clicked', async () => {
		const onchange = vi.fn();
		render(RadioField, { props: { field: createField(), value: undefined, onchange } });

		await fireEvent.click(screen.getByRole('radio', { name: 'Female' }));

		expect(onchange).toHaveBeenCalledWith('female');
	});

	it('calls onchange when switching from one option to another', async () => {
		const onchange = vi.fn();
		render(RadioField, { props: { field: createField(), value: 'male', onchange } });

		await fireEvent.click(screen.getByRole('radio', { name: 'Other' }));

		expect(onchange).toHaveBeenCalledWith('other');
	});

	it('applies selected styling only to the chosen option', async () => {
		const { container } = render(RadioField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});

		await fireEvent.click(screen.getByRole('radio', { name: 'Male' }));

		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(1);
	});
});
