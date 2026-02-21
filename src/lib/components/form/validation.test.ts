import { describe, it, expect } from 'vitest';
import { validateField, validateForm } from './validation';
import type { TFormField } from '$lib/types';

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

describe('validateField', () => {
	describe('required field validation', () => {
		it('should return error for required field with empty string', () => {
			const field = createField({ is_required: true });
			expect(validateField(field, '')).toBe('Test Field is required');
		});

		it('should return error for required field with null', () => {
			const field = createField({ is_required: true });
			expect(validateField(field, null)).toBe('Test Field is required');
		});

		it('should return error for required field with undefined', () => {
			const field = createField({ is_required: true });
			expect(validateField(field, undefined)).toBe('Test Field is required');
		});

		it('should return error for required field with empty array', () => {
			const field = createField({ is_required: true });
			expect(validateField(field, [])).toBe('Test Field is required');
		});

		it('should return custom error message for required field', () => {
			const field = createField({
				is_required: true,
				validation: { custom_error_message: 'This is mandatory' }
			});
			expect(validateField(field, '')).toBe('This is mandatory');
		});

		it('should pass for required field with non-empty value', () => {
			const field = createField({ is_required: true });
			expect(validateField(field, 'hello')).toBeNull();
		});

		it('should pass for required field with non-empty array', () => {
			const field = createField({ is_required: true });
			expect(validateField(field, [1, 2])).toBeNull();
		});
	});

	describe('non-required empty value handling', () => {
		it('should return null for non-required field with empty string', () => {
			const field = createField({ is_required: false });
			expect(validateField(field, '')).toBeNull();
		});

		it('should return null for non-required field with null', () => {
			const field = createField({ is_required: false });
			expect(validateField(field, null)).toBeNull();
		});

		it('should return null for non-required field with undefined', () => {
			const field = createField({ is_required: false });
			expect(validateField(field, undefined)).toBeNull();
		});
	});

	describe('email validation', () => {
		it('should pass for valid email', () => {
			const field = createField({ field_type: 'email' });
			expect(validateField(field, 'user@example.com')).toBeNull();
		});

		it('should fail for email without @', () => {
			const field = createField({ field_type: 'email' });
			expect(validateField(field, 'userexample.com')).toBe('Please enter a valid email address');
		});

		it('should fail for email without domain', () => {
			const field = createField({ field_type: 'email' });
			expect(validateField(field, 'user@')).toBe('Please enter a valid email address');
		});

		it('should fail for email without local part', () => {
			const field = createField({ field_type: 'email' });
			expect(validateField(field, '@example.com')).toBe('Please enter a valid email address');
		});

		it('should return custom error for invalid email', () => {
			const field = createField({
				field_type: 'email',
				validation: { custom_error_message: 'Bad email' }
			});
			expect(validateField(field, 'invalid')).toBe('Bad email');
		});

		it('should validate email even without validation object', () => {
			const field = createField({ field_type: 'email' });
			// No validation property at all — email check should still run
			expect(validateField(field, 'not-an-email')).toBe('Please enter a valid email address');
		});
	});

	describe('phone validation', () => {
		it('should pass for valid phone with special characters', () => {
			const field = createField({ field_type: 'phone' });
			expect(validateField(field, '+1-234-567-8901')).toBeNull();
		});

		it('should pass for simple numeric phone', () => {
			const field = createField({ field_type: 'phone' });
			expect(validateField(field, '1234567890')).toBeNull();
		});

		it('should fail for phone with letters', () => {
			const field = createField({ field_type: 'phone' });
			expect(validateField(field, '123-abc-7890')).toBe('Please enter a valid phone number');
		});

		it('should fail for phone too short', () => {
			const field = createField({ field_type: 'phone' });
			expect(validateField(field, '12345')).toBe('Please enter a valid phone number');
		});

		it('should fail for phone too long', () => {
			const field = createField({ field_type: 'phone' });
			expect(validateField(field, '1'.repeat(21))).toBe('Please enter a valid phone number');
		});

		it('should return custom error for invalid phone', () => {
			const field = createField({
				field_type: 'phone',
				validation: { custom_error_message: 'Bad phone' }
			});
			expect(validateField(field, 'abc')).toBe('Bad phone');
		});

		it('should validate phone even without validation object', () => {
			const field = createField({ field_type: 'phone' });
			expect(validateField(field, 'not-a-phone!!')).toBe('Please enter a valid phone number');
		});
	});

	describe('string length validation', () => {
		it('should pass when length equals min_length', () => {
			const field = createField({ validation: { min_length: 3 } });
			expect(validateField(field, 'abc')).toBeNull();
		});

		it('should fail when length is below min_length', () => {
			const field = createField({ validation: { min_length: 3 } });
			expect(validateField(field, 'ab')).toBe('Test Field must be at least 3 characters');
		});

		it('should pass when length equals max_length', () => {
			const field = createField({ validation: { max_length: 5 } });
			expect(validateField(field, 'abcde')).toBeNull();
		});

		it('should fail when length exceeds max_length', () => {
			const field = createField({ validation: { max_length: 5 } });
			expect(validateField(field, 'abcdef')).toBe('Test Field must be at most 5 characters');
		});

		it('should return custom error for length violation', () => {
			const field = createField({
				validation: { min_length: 5, custom_error_message: 'Too short!' }
			});
			expect(validateField(field, 'ab')).toBe('Too short!');
		});

		it('should ignore min_length when null', () => {
			const field = createField({ validation: { min_length: null } });
			expect(validateField(field, 'a')).toBeNull();
		});

		it('should ignore max_length when null', () => {
			const field = createField({ validation: { max_length: null } });
			expect(validateField(field, 'a'.repeat(1000))).toBeNull();
		});
	});

	describe('number validation', () => {
		it('should fail for non-numeric value on number field', () => {
			const field = createField({
				field_type: 'number',
				validation: {}
			});
			expect(validateField(field, 'abc')).toBe('Test Field must be a valid number');
		});

		it('should pass for valid number', () => {
			const field = createField({
				field_type: 'number',
				validation: {}
			});
			expect(validateField(field, '42')).toBeNull();
		});

		it('should fail when number is below min_value', () => {
			const field = createField({
				field_type: 'number',
				validation: { min_value: 10 }
			});
			expect(validateField(field, '5')).toBe('Test Field must be at least 10');
		});

		it('should pass when number equals min_value', () => {
			const field = createField({
				field_type: 'number',
				validation: { min_value: 10 }
			});
			expect(validateField(field, '10')).toBeNull();
		});

		it('should fail when number exceeds max_value', () => {
			const field = createField({
				field_type: 'number',
				validation: { max_value: 50 }
			});
			expect(validateField(field, '100')).toBe('Test Field must be at most 50');
		});

		it('should pass when number equals max_value', () => {
			const field = createField({
				field_type: 'number',
				validation: { max_value: 50 }
			});
			expect(validateField(field, '50')).toBeNull();
		});

		it('should return custom error for number violation', () => {
			const field = createField({
				field_type: 'number',
				validation: { min_value: 10, custom_error_message: 'Number too small' }
			});
			expect(validateField(field, '5')).toBe('Number too small');
		});

		it('should not apply number validation to non-number field type', () => {
			const field = createField({
				field_type: 'text',
				validation: { min_value: 10 }
			});
			expect(validateField(field, '5')).toBeNull();
		});
	});

	describe('pattern validation', () => {
		it('should pass when value matches pattern', () => {
			const field = createField({ validation: { pattern: '^[A-Z]+$' } });
			expect(validateField(field, 'ABC')).toBeNull();
		});

		it('should fail when value does not match pattern', () => {
			const field = createField({ validation: { pattern: '^[A-Z]+$' } });
			expect(validateField(field, 'abc')).toBe('Test Field has an invalid format');
		});

		it('should return custom error for pattern mismatch', () => {
			const field = createField({
				validation: { pattern: '^[A-Z]+$', custom_error_message: 'Uppercase only' }
			});
			expect(validateField(field, 'abc')).toBe('Uppercase only');
		});

		it('should silently skip invalid regex pattern', () => {
			const field = createField({ validation: { pattern: '[invalid' } });
			expect(validateField(field, 'anything')).toBeNull();
		});
	});

	describe('no validation object', () => {
		it('should return null for text field without validation', () => {
			const field = createField({ field_type: 'text' });
			expect(validateField(field, 'anything')).toBeNull();
		});

		it('should return null when validation is null', () => {
			const field = createField({ validation: null });
			expect(validateField(field, 'anything')).toBeNull();
		});
	});
});

describe('validateForm', () => {
	it('should return empty errors for valid form', () => {
		const fields = [
			createField({ name: 'name', is_required: true }),
			createField({ name: 'email', field_type: 'email' })
		];
		const responses = { name: 'John', email: 'john@example.com' };
		expect(validateForm(fields, responses)).toEqual({});
	});

	it('should return errors for invalid fields', () => {
		const fields = [createField({ name: 'name', is_required: true })];
		const responses = { name: '' };
		const errors = validateForm(fields, responses);
		expect(errors).toHaveProperty('name');
		expect(errors.name).toBe('Test Field is required');
	});

	it('should validate all fields independently', () => {
		const fields = [
			createField({ name: 'required_field', is_required: true }),
			createField({ name: 'optional_field', is_required: false })
		];
		const responses = { required_field: '', optional_field: '' };
		const errors = validateForm(fields, responses);
		expect(Object.keys(errors)).toEqual(['required_field']);
	});

	it('should handle empty fields array', () => {
		expect(validateForm([], {})).toEqual({});
	});

	it('should handle missing response for a field', () => {
		const fields = [createField({ name: 'missing', is_required: true })];
		const errors = validateForm(fields, {});
		expect(errors).toHaveProperty('missing');
	});
});
