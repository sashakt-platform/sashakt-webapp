import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SelectField from './SelectField.svelte';
import type { TFormField } from '$lib/types';
import { initializeI18nForTests, setLocaleForTests } from '$lib/test-utils';

beforeAll(() => {
	initializeI18nForTests();
});

beforeEach(async () => {
	await setLocaleForTests('en-US');
});

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'select',
		label: 'City',
		name: 'city',
		is_required: false,
		order: 1,
		options: [
			{ id: 1, label: 'Delhi', value: 'delhi' },
			{ id: 2, label: 'Mumbai', value: 'mumbai' },
			{ id: 3, label: 'Bangalore', value: 'bangalore' }
		],
		...overrides
	};
}

describe('SelectField rendering', () => {
	it('renders a combobox trigger button', () => {
		render(SelectField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});

	it('shows placeholder text when no value is selected', () => {
		const field = createField({ placeholder: 'Choose a city' });
		render(SelectField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByText('Choose a city')).toBeInTheDocument();
	});

	it('shows default "Select an option" when no placeholder and no value', () => {
		const field = createField({ placeholder: null });
		render(SelectField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByText('Select an option')).toBeInTheDocument();
	});

	it('displays the label of the selected value', () => {
		render(SelectField, { props: { field: createField(), value: 'mumbai', onchange: vi.fn() } });
		expect(screen.getByText('Mumbai')).toBeInTheDocument();
	});

	it('uses default_value when value is undefined', () => {
		const field = createField({ default_value: 'bangalore' });
		render(SelectField, { props: { field, value: undefined, onchange: vi.fn() } });
		expect(screen.getByText('Bangalore')).toBeInTheDocument();
	});
});

describe('SelectField dropdown interaction', () => {
	it('opens dropdown when trigger is clicked', async () => {
		render(SelectField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });

		await fireEvent.click(screen.getByRole('combobox'));

		expect(screen.getByText('Delhi')).toBeInTheDocument();
		expect(screen.getByText('Mumbai')).toBeInTheDocument();
		expect(screen.getByText('Bangalore')).toBeInTheDocument();
	});

	it('renders a search input inside the dropdown', async () => {
		render(SelectField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });

		await fireEvent.click(screen.getByRole('combobox'));

		expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
	});

	it('calls onchange when an option is selected', async () => {
		const onchange = vi.fn();
		render(SelectField, { props: { field: createField(), value: undefined, onchange } });

		await fireEvent.click(screen.getByRole('combobox'));
		await fireEvent.click(screen.getByText('Delhi'));

		expect(onchange).toHaveBeenCalledWith('delhi');
	});

	it('updates displayed label after selecting an option', async () => {
		render(SelectField, { props: { field: createField(), value: undefined, onchange: vi.fn() } });

		await fireEvent.click(screen.getByRole('combobox'));
		await fireEvent.click(screen.getByText('Mumbai'));

		expect(screen.getByRole('combobox')).toHaveTextContent('Mumbai');
	});

	it('renders nothing in dropdown when options is null', async () => {
		const field = createField({ options: null });
		render(SelectField, { props: { field, value: undefined, onchange: vi.fn() } });

		await fireEvent.click(screen.getByRole('combobox'));

		expect(screen.queryByText('Delhi')).not.toBeInTheDocument();
	});
});

describe('SelectField selection state', () => {
	it('prefers value over default_value', () => {
		const field = createField({ default_value: 'bangalore' });
		render(SelectField, { props: { field, value: 'delhi', onchange: vi.fn() } });
		expect(screen.getByText('Delhi')).toBeInTheDocument();
		expect(screen.queryByText('Bangalore')).not.toBeInTheDocument();
	});

	it('calls onchange only once per selection', async () => {
		const onchange = vi.fn();
		render(SelectField, { props: { field: createField(), value: undefined, onchange } });

		await fireEvent.click(screen.getByRole('combobox'));
		await fireEvent.click(screen.getByText('Bangalore'));

		expect(onchange).toHaveBeenCalledTimes(1);
		expect(onchange).toHaveBeenCalledWith('bangalore');
	});
});
