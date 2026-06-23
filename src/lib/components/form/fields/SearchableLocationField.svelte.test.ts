import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SearchableLocationField from './SearchableLocationField.svelte';
import type { TFormField } from '$lib/types';
import { initializeI18nForTests, setLocaleForTests } from '$lib/test-utils';

beforeAll(() => {
	initializeI18nForTests();
});

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'district',
		label: 'District',
		name: 'district',
		is_required: false,
		order: 1,
		...overrides
	};
}

const mockResults = {
	items: [
		{ id: 10, name: 'Pune' },
		{ id: 20, name: 'Mumbai' },
		{ id: 30, name: 'Nagpur' }
	]
};

function mockFetchSuccess(data = mockResults) {
	(global.fetch as Mock).mockResolvedValue({
		ok: true,
		json: () => Promise.resolve(data)
	});
}

function mockFetchEmpty() {
	(global.fetch as Mock).mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ items: [] })
	});
}

function mockFetchFailure() {
	(global.fetch as Mock).mockResolvedValue({ ok: false });
}

beforeEach(async () => {
	await setLocaleForTests('en-US');
	vi.useFakeTimers();
	global.fetch = vi.fn();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('SearchableLocationField rendering', () => {
	it('renders a combobox trigger button', () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});

	it('shows placeholder when no value is selected', () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField({ placeholder: 'Select district' }),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});
		expect(screen.getByText('Select district')).toBeInTheDocument();
	});

	it('shows default placeholder when no placeholder and no value', () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField({ placeholder: null }),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});
		expect(screen.getByText('Type to search...')).toBeInTheDocument();
	});
});

describe('SearchableLocationField parent dependency', () => {
	it('disables the button when parent is required but not selected', () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField({ field_type: 'block' }),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: 'district',
				parentId: undefined,
				testId: 1
			}
		});
		expect(screen.getByRole('combobox')).toBeDisabled();
	});

	it('enables the button when parent is selected', () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField({ field_type: 'block' }),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: 'district',
				parentId: 5,
				testId: 1
			}
		});
		expect(screen.getByRole('combobox')).not.toBeDisabled();
	});

	it('is enabled when no parent dependency exists', () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});
		expect(screen.getByRole('combobox')).not.toBeDisabled();
	});
});

describe('SearchableLocationField API calls', () => {
	it('fetches results when dropdown opens', async () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 42
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/location/district?test_id=42'),
				expect.any(Object)
			);
		});
	});

	it('uses block endpoint for block field type', async () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField({ field_type: 'block' }),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: 'district',
				parentId: 5,
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/location/block'),
				expect.any(Object)
			);
		});
	});

	it('includes parent ID param for district field', async () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: 'state',
				parentId: 7,
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('state_ids=7'),
				expect.any(Object)
			);
		});
	});

	it('includes parent ID param as district_ids for block field', async () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField({ field_type: 'block' }),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: 'district',
				parentId: 12,
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('district_ids=12'),
				expect.any(Object)
			);
		});
	});

	it('debounces search input by 300ms', async () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));
		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
		(global.fetch as Mock).mockClear();

		const input = screen.getByPlaceholderText('Type to search...');
		await fireEvent.input(input, { target: { value: 'Pu' } });

		expect(global.fetch).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);

		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining('name=Pu'),
			expect.any(Object)
		);
	});
});

describe('SearchableLocationField dropdown interaction', () => {
	it('displays fetched results in the dropdown', async () => {
		mockFetchSuccess();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('Pune')).toBeInTheDocument();
			expect(screen.getByText('Mumbai')).toBeInTheDocument();
			expect(screen.getByText('Nagpur')).toBeInTheDocument();
		});
	});

	it('calls onchange with result id when an option is selected', async () => {
		mockFetchSuccess();
		const onchange = vi.fn();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange,
				parentFieldName: '',
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));
		await waitFor(() => expect(screen.getByText('Pune')).toBeInTheDocument());
		await fireEvent.click(screen.getByText('Pune'));

		expect(onchange).toHaveBeenCalledWith(10);
	});

	it('handles empty results from API', async () => {
		mockFetchEmpty();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('No results found')).toBeInTheDocument();
		});
	});

	it('handles API failure gracefully', async () => {
		mockFetchFailure();
		render(SearchableLocationField, {
			props: {
				field: createField(),
				value: undefined,
				onchange: vi.fn(),
				parentFieldName: '',
				testId: 1
			}
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('No results found')).toBeInTheDocument();
		});
	});
});

describe('SearchableLocationField parent change reset', () => {
	it('resets selection and calls onchange(0) when parentId changes', async () => {
		mockFetchSuccess();
		const onchange = vi.fn();
		const { rerender } = render(SearchableLocationField, {
			props: {
				field: createField({ field_type: 'block' }),
				value: undefined,
				onchange,
				parentFieldName: 'district',
				parentId: 5,
				testId: 1
			}
		});

		await rerender({
			field: createField({ field_type: 'block' }),
			value: undefined,
			onchange,
			parentFieldName: 'district',
			parentId: 10,
			testId: 1
		});

		expect(onchange).toHaveBeenCalledWith(0);
	});
});
