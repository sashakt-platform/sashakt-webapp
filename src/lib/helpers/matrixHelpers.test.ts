import { describe, it, expect } from 'vitest';
import { parseMatrixResponse } from './matrixHelpers';

describe('parseMatrixResponse', () => {
	it('returns empty object for undefined', () => {
		expect(parseMatrixResponse(undefined)).toEqual({});
	});

	it('returns empty object for empty string', () => {
		expect(parseMatrixResponse('')).toEqual({});
	});

	it('returns empty object for a number array (wrong type)', () => {
		expect(parseMatrixResponse([1, 2, 3])).toEqual({});
	});

	it('returns empty object for invalid JSON string', () => {
		expect(parseMatrixResponse('not json')).toEqual({});
	});

	it('returns empty object for malformed JSON', () => {
		expect(parseMatrixResponse('{row1: 2')).toEqual({});
	});

	it('parses a valid JSON object string', () => {
		expect(parseMatrixResponse('{"1":2,"3":4}')).toEqual({ '1': 2, '3': 4 });
	});

	it('parses a single row-to-column mapping', () => {
		expect(parseMatrixResponse('{"5":10}')).toEqual({ '5': 10 });
	});

	it('returns null for JSON null string (parse result passed through)', () => {
		expect(parseMatrixResponse('null')).toBeNull();
	});

	it('returns parsed array for JSON array string (parse result passed through)', () => {
		expect(parseMatrixResponse('[1,2]')).toEqual([1, 2]);
	});
});
