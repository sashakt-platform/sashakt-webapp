import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SearchableEntityField from './SearchableEntityField.svelte';
import type { TFormField } from '$lib/types';
import { initializeI18nForTests, setLocaleForTests } from '$lib/test-utils';

beforeAll(() => {
	initializeI18nForTests();
});

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'entity',
		label: 'School',
		name: 'school',
		is_required: false,
		order: 1,
		entity_type_id: 5,
		...overrides
	};
}

const mockResults = {
	items: [
		{ id: 100, name: 'ABC School', district: { name: 'Pune' } },
		{ id: 200, name: 'XYZ Academy', state: { name: 'Maharashtra' } },
		{ id: 300, name: 'PQR Institute' }
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

function mockFetch404() {
	(global.fetch as Mock).mockResolvedValue({ ok: false, status: 404 });
}

function mockFetchFailure() {
	(global.fetch as Mock).mockResolvedValue({ ok: false, status: 500 });
}

const defaultProps = {
	value: undefined as unknown,
	onchange: vi.fn(),
	testLink: 'test-abc-123'
};

beforeEach(async () => {
	await setLocaleForTests('en-US');
	vi.useFakeTimers();
	global.fetch = vi.fn();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('SearchableEntityField rendering', () => {
	it('renders a combobox trigger button', () => {
		mockFetchSuccess();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });
		expect(screen.getByRole('combobox')).toBeInTheDocument();
	});

	it('shows placeholder when no value is selected', () => {
		mockFetchSuccess();
		render(SearchableEntityField, {
			props: { ...defaultProps, field: createField({ placeholder: 'Select school' }) }
		});
		expect(screen.getByText('Select school')).toBeInTheDocument();
	});

	it('shows default placeholder when no placeholder and no value', () => {
		mockFetchSuccess();
		render(SearchableEntityField, {
			props: { ...defaultProps, field: createField({ placeholder: null }) }
		});
		expect(screen.getByText('Type to search...')).toBeInTheDocument();
	});
});

describe('SearchableEntityField API calls', () => {
	it('fetches results when dropdown opens', async () => {
		mockFetchSuccess();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/entity?test_link=test-abc-123'),
				expect.any(Object)
			);
		});
	});

	it('includes entity_type_id in the request', async () => {
		mockFetchSuccess();
		render(SearchableEntityField, {
			props: { ...defaultProps, field: createField({ entity_type_id: 7 }) }
		});

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('entity_type_id=7'),
				expect.any(Object)
			);
		});
	});

	it('debounces search input by 300ms', async () => {
		mockFetchSuccess();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));
		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
		(global.fetch as Mock).mockClear();
		mockFetchSuccess();

		const input = screen.getByPlaceholderText('Type to search...');
		await fireEvent.input(input, { target: { value: 'ABC' } });

		expect(global.fetch).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);

		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining('name=ABC'),
			expect.any(Object)
		);
	});
});

describe('SearchableEntityField dropdown interaction', () => {
	it('displays results with location labels', async () => {
		mockFetchSuccess();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('ABC School (Pune)')).toBeInTheDocument();
			expect(screen.getByText('XYZ Academy (Maharashtra)')).toBeInTheDocument();
			expect(screen.getByText('PQR Institute')).toBeInTheDocument();
		});
	});

	it('shows block name over district and state in display label', async () => {
		(global.fetch as Mock).mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					items: [
						{
							id: 1,
							name: 'Test School',
							block: { name: 'Haveli' },
							district: { name: 'Pune' },
							state: { name: 'MH' }
						}
					]
				})
		});
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('Test School (Haveli)')).toBeInTheDocument();
		});
	});

	it('calls onchange with result id when an option is selected', async () => {
		mockFetchSuccess();
		const onchange = vi.fn();
		render(SearchableEntityField, {
			props: { ...defaultProps, field: createField(), onchange }
		});

		await fireEvent.click(screen.getByRole('combobox'));
		await waitFor(() => expect(screen.getByText('ABC School (Pune)')).toBeInTheDocument());
		await fireEvent.click(screen.getByText('ABC School (Pune)'));

		expect(onchange).toHaveBeenCalledWith(100);
	});

	it('updates displayed label after selecting an option', async () => {
		mockFetchSuccess();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));
		await waitFor(() => expect(screen.getByText('XYZ Academy (Maharashtra)')).toBeInTheDocument());
		await fireEvent.click(screen.getByText('XYZ Academy (Maharashtra)'));

		expect(screen.getByRole('combobox')).toHaveTextContent('XYZ Academy (Maharashtra)');
	});
});

describe('SearchableEntityField error handling', () => {
	it('shows "No results found" when API returns empty items', async () => {
		mockFetchEmpty();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('No results found')).toBeInTheDocument();
		});
	});

	it('shows invalid link message on 404 response', async () => {
		mockFetch404();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('This link is invalid or expired')).toBeInTheDocument();
		});
	});

	it('shows "No results found" on non-404 API failure', async () => {
		mockFetchFailure();
		render(SearchableEntityField, { props: { ...defaultProps, field: createField() } });

		await fireEvent.click(screen.getByRole('combobox'));

		await waitFor(() => {
			expect(screen.getByText('No results found')).toBeInTheDocument();
		});
	});
});
