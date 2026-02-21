import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FormField from './FormField.svelte';
import type { TFormField } from '$lib/types';

vi.stubGlobal('fetch', vi.fn());

function createField(overrides: Partial<TFormField> = {}): TFormField {
	return {
		id: 1,
		field_type: 'text',
		label: 'Test Field',
		name: 'test_field',
		is_required: false,
		order: 1,
		...overrides
	};
}

const defaultProps = {
	value: undefined,
	testId: 1,
	onchange: () => {}
};

describe('FormField', () => {
	describe('field type routing', () => {
		it('should render text input for field_type text', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'text' }) }
			});
			expect(container.querySelector('input[type="text"]')).not.toBeNull();
		});

		it('should render text input for field_type full_name', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'full_name' }) }
			});
			expect(container.querySelector('input[type="text"]')).not.toBeNull();
		});

		it('should render email input for field_type email', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'email' }) }
			});
			expect(container.querySelector('input[type="email"]')).not.toBeNull();
		});

		it('should render tel input for field_type phone', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'phone' }) }
			});
			expect(container.querySelector('input[type="tel"]')).not.toBeNull();
		});

		it('should render textarea for field_type textarea', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'textarea' }) }
			});
			expect(container.querySelector('textarea')).not.toBeNull();
		});

		it('should render number input for field_type number', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'number' }) }
			});
			expect(container.querySelector('input[type="number"]')).not.toBeNull();
		});

		it('should render date input for field_type date', () => {
			const { container } = render(FormField, {
				props: { ...defaultProps, field: createField({ field_type: 'date' }) }
			});
			expect(container.querySelector('input[type="date"]')).not.toBeNull();
		});

		it('should render select field without errors', () => {
			const field = createField({
				field_type: 'select',
				options: [{ id: 1, label: 'Option 1', value: 'opt1' }]
			});
			const { container } = render(FormField, {
				props: { ...defaultProps, field }
			});
			expect(container.querySelector('.space-y-2')).not.toBeNull();
			expect(screen.getByText('Test Field')).toBeInTheDocument();
		});

		it('should render radio field without errors', () => {
			const field = createField({
				field_type: 'radio',
				options: [{ id: 1, label: 'Option 1', value: 'opt1' }]
			});
			render(FormField, {
				props: { ...defaultProps, field }
			});
			expect(screen.getByText('Option 1')).toBeInTheDocument();
		});

		it('should render checkbox field without errors', () => {
			const field = createField({ field_type: 'checkbox' });
			render(FormField, {
				props: { ...defaultProps, field }
			});
			expect(screen.getByText('Test Field')).toBeInTheDocument();
		});

		it('should render multi_select field without errors', () => {
			const field = createField({
				field_type: 'multi_select',
				options: [{ id: 1, label: 'Multi 1', value: 'multi1' }]
			});
			render(FormField, {
				props: { ...defaultProps, field }
			});
			expect(screen.getByText('Multi 1')).toBeInTheDocument();
		});

		it('should render entity field without errors', () => {
			const field = createField({ field_type: 'entity', entity_type_id: 1 });
			render(FormField, {
				props: { ...defaultProps, field }
			});
			expect(screen.getByText('Test Field')).toBeInTheDocument();
		});

		it('should render state field without errors', () => {
			const field = createField({ field_type: 'state' });
			render(FormField, {
				props: {
					...defaultProps,
					field,
					locations: { states: [{ id: 1, name: 'State A' }] }
				}
			});
			expect(screen.getByText('Test Field')).toBeInTheDocument();
		});

		it('should render district field without errors', () => {
			const field = createField({ field_type: 'district' });
			render(FormField, {
				props: { ...defaultProps, field, hasStateField: true, selectedState: 5 }
			});
			expect(screen.getByText('Test Field')).toBeInTheDocument();
		});

		it('should render block field without errors', () => {
			const field = createField({ field_type: 'block' });
			render(FormField, {
				props: { ...defaultProps, field, hasDistrictField: true, selectedDistrict: 10 }
			});
			expect(screen.getByText('Test Field')).toBeInTheDocument();
		});
	});

	describe('label and required indicator', () => {
		it('should render field label', () => {
			render(FormField, {
				props: { ...defaultProps, field: createField({ label: 'Full Name' }) }
			});
			expect(screen.getByText('Full Name')).toBeInTheDocument();
		});

		it('should show required indicator for required fields', () => {
			render(FormField, {
				props: { ...defaultProps, field: createField({ is_required: true }) }
			});
			expect(screen.getByText('*')).toBeInTheDocument();
		});

		it('should not show required indicator for optional fields', () => {
			render(FormField, {
				props: { ...defaultProps, field: createField({ is_required: false }) }
			});
			expect(screen.queryByText('*')).not.toBeInTheDocument();
		});
	});

	describe('help text', () => {
		it('should render help text when provided', () => {
			render(FormField, {
				props: {
					...defaultProps,
					field: createField({ help_text: 'Enter your full name' })
				}
			});
			expect(screen.getByText('Enter your full name')).toBeInTheDocument();
		});

		it('should not render help text when null', () => {
			render(FormField, {
				props: {
					...defaultProps,
					field: createField({ help_text: null })
				}
			});
			expect(screen.queryByText('Enter your full name')).not.toBeInTheDocument();
		});

		it('should not render help text when not provided', () => {
			render(FormField, {
				props: { ...defaultProps, field: createField() }
			});
			// No help text paragraph should exist
			const helpTexts = document.querySelectorAll('.text-muted-foreground.text-xs');
			expect(helpTexts.length).toBe(0);
		});
	});

	describe('error message', () => {
		it('should render error message when provided', () => {
			render(FormField, {
				props: {
					...defaultProps,
					field: createField(),
					error: 'This field is required'
				}
			});
			expect(screen.getByText('This field is required')).toBeInTheDocument();
		});

		it('should not render error message when not provided', () => {
			render(FormField, {
				props: { ...defaultProps, field: createField() }
			});
			const errorTexts = document.querySelectorAll('.text-destructive.text-sm');
			expect(errorTexts.length).toBe(0);
		});
	});
});
