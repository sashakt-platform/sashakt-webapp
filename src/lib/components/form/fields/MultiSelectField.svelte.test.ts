import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MultiSelectField from './MultiSelectField.svelte';
import type { TFormField } from '$lib/types';

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'multi_select',
		label: 'Favourite Colors',
		name: 'colors',
		is_required: false,
		order: 1,
		options: [
			{ id: 1, label: 'Red', value: 'red' },
			{ id: 2, label: 'Green', value: 'green' },
			{ id: 3, label: 'Blue', value: 'blue' }
		],
		...overrides
	};
}

const defaultProps = {
	value: [],
	onchange: vi.fn()
};

describe('MultiSelectField rendering', () => {
	it('renders all option labels', () => {
		render(MultiSelectField, { props: { ...defaultProps, field: createField() } });
		expect(screen.getByText('Red')).toBeInTheDocument();
		expect(screen.getByText('Green')).toBeInTheDocument();
		expect(screen.getByText('Blue')).toBeInTheDocument();
	});

	it('renders letter labels A, B, C for each option', () => {
		render(MultiSelectField, { props: { ...defaultProps, field: createField() } });
		expect(screen.getByText('A')).toBeInTheDocument();
		expect(screen.getByText('B')).toBeInTheDocument();
		expect(screen.getByText('C')).toBeInTheDocument();
	});

	it('renders nothing when options is null', () => {
		const field = createField({ options: null });
		const { container } = render(MultiSelectField, { props: { ...defaultProps, field } });
		expect(container.querySelectorAll('button').length).toBe(0);
	});

	it('renders nothing when options is an empty array', () => {
		const field = createField({ options: [] });
		const { container } = render(MultiSelectField, { props: { ...defaultProps, field } });
		expect(container.querySelectorAll('button').length).toBe(0);
	});

	it('renders one pill row per option', () => {
		const { container } = render(MultiSelectField, {
			props: { ...defaultProps, field: createField() }
		});
		expect(container.querySelectorAll('button[type="button"]').length).toBe(3);
	});
});

describe('MultiSelectField initial selection state', () => {
	it('renders no options as selected when value is empty array', () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: [], onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(0);
	});

	it('pre-selects options matching the initial value', () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: ['red', 'blue'], onchange: vi.fn() }
		});
		const selectedPills = container.querySelectorAll('.bg-primary\\/10');
		expect(selectedPills.length).toBe(2);
	});

	it('pre-selects a single option when value has one entry', () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: ['green'], onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(1);
	});

	it('pre-selects all options when all values are provided', () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: ['red', 'green', 'blue'], onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(3);
	});
});

describe('MultiSelectField toggle behaviour', () => {
	it('selects an option when clicked', async () => {
		const onchange = vi.fn();
		render(MultiSelectField, { props: { field: createField(), value: [], onchange } });

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));

		expect(onchange).toHaveBeenCalledWith(['red']);
	});

	it('deselects an already-selected option when clicked again', async () => {
		const onchange = vi.fn();
		render(MultiSelectField, { props: { field: createField(), value: ['red'], onchange } });

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));

		expect(onchange).toHaveBeenCalledWith([]);
	});

	it('selecting one option does not affect others', async () => {
		const onchange = vi.fn();
		render(MultiSelectField, { props: { field: createField(), value: ['red'], onchange } });

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Green' }));

		expect(onchange).toHaveBeenCalledWith(expect.arrayContaining(['red', 'green']));
		expect(onchange.mock.calls[0][0]).toHaveLength(2);
	});

	it('can select multiple options independently', async () => {
		const onchange = vi.fn();
		render(MultiSelectField, { props: { field: createField(), value: [], onchange } });

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));
		await fireEvent.click(screen.getByRole('checkbox', { name: 'Blue' }));

		expect(onchange).toHaveBeenCalledTimes(2);
		expect(onchange).toHaveBeenLastCalledWith(expect.arrayContaining(['red', 'blue']));
	});

	it('deselecting one option leaves others intact', async () => {
		const onchange = vi.fn();
		render(MultiSelectField, {
			props: { field: createField(), value: ['red', 'green', 'blue'], onchange }
		});

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Green' }));

		expect(onchange).toHaveBeenCalledWith(expect.arrayContaining(['red', 'blue']));
		expect(onchange.mock.calls[0][0]).not.toContain('green');
	});

	it('calls onchange with a plain array copy, not the reactive proxy', async () => {
		const onchange = vi.fn();
		render(MultiSelectField, { props: { field: createField(), value: [], onchange } });

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));

		const result = onchange.mock.calls[0][0];
		expect(Array.isArray(result)).toBe(true);
		expect(result).toEqual(['red']);
	});
});

describe('MultiSelectField pill styling', () => {
	it('applies selected styles to checked option pill', async () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: [], onchange: vi.fn() }
		});

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));

		expect(container.querySelectorAll('.border-primary').length).toBeGreaterThan(0);
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(1);
	});

	it('removes selected styles from deselected option pill', async () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: ['red'], onchange: vi.fn() }
		});

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }));

		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(0);
	});
});

describe('MultiSelectField value sync', () => {
	it('treats non-array value as empty selection', () => {
		const { container } = render(MultiSelectField, {
			props: { field: createField(), value: undefined, onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(0);
	});

	it('converts numeric string values to string for matching', () => {
		const field = createField({
			options: [{ id: 1, label: 'Option 1', value: '1' }]
		});
		const { container } = render(MultiSelectField, {
			props: { field, value: ['1'], onchange: vi.fn() }
		});
		expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(1);
	});
});
