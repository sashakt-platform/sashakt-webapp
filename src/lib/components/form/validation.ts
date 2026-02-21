import type { TFormField, TFormResponses } from '$lib/types';

export type ValidationErrors = Record<string, string>;

export function validateField(field: TFormField, value: unknown): string | null {
	// Check required
	if (field.is_required) {
		if (value === undefined || value === null || value === '') {
			return field.validation?.custom_error_message || `${field.label} is required`;
		}
		// For arrays (multi_select), check if empty
		if (Array.isArray(value) && value.length === 0) {
			return field.validation?.custom_error_message || `${field.label} is required`;
		}
	}

	// Skip further validation if value is empty and not required
	if (value === undefined || value === null || value === '') {
		return null;
	}

	const stringValue = String(value);

	// Email/phone format checks run based on field_type, independent of the validation object
	if (field.field_type === 'email') {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(stringValue)) {
			return field.validation?.custom_error_message || 'Please enter a valid email address';
		}
	}

	if (field.field_type === 'phone') {
		const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
		if (!phoneRegex.test(stringValue)) {
			return field.validation?.custom_error_message || 'Please enter a valid phone number';
		}
	}

	const validation = field.validation;
	if (!validation) return null;

	// String length validation
	if (validation.min_length !== null && validation.min_length !== undefined) {
		if (stringValue.length < validation.min_length) {
			return (
				validation.custom_error_message ||
				`${field.label} must be at least ${validation.min_length} characters`
			);
		}
	}

	if (validation.max_length !== null && validation.max_length !== undefined) {
		if (stringValue.length > validation.max_length) {
			return (
				validation.custom_error_message ||
				`${field.label} must be at most ${validation.max_length} characters`
			);
		}
	}

	// Number value validation
	if (field.field_type === 'number') {
		const numValue = Number(value);
		if (isNaN(numValue)) {
			return validation.custom_error_message || `${field.label} must be a valid number`;
		}
		if (validation.min_value !== null && validation.min_value !== undefined) {
			if (numValue < validation.min_value) {
				return (
					validation.custom_error_message ||
					`${field.label} must be at least ${validation.min_value}`
				);
			}
		}
		if (validation.max_value !== null && validation.max_value !== undefined) {
			if (numValue > validation.max_value) {
				return (
					validation.custom_error_message ||
					`${field.label} must be at most ${validation.max_value}`
				);
			}
		}
	}

	// Pattern validation
	if (validation.pattern) {
		try {
			const regex = new RegExp(validation.pattern);
			if (!regex.test(stringValue)) {
				return validation.custom_error_message || `${field.label} has an invalid format`;
			}
		} catch {
			// Invalid regex pattern, skip validation
		}
	}

	return null;
}

export function validateForm(fields: TFormField[], responses: TFormResponses): ValidationErrors {
	const errors: ValidationErrors = {};

	for (const field of fields) {
		const error = validateField(field, responses[field.name]);
		if (error) {
			errors[field.name] = error;
		}
	}

	return errors;
}
