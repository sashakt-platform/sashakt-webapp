import { describe, it, expect } from 'vitest';
import { parseJsonRecord } from './matrixHelpers';

describe('parseJsonRecord', () => {
	it('returns empty object for undefined', () => {
		expect(parseJsonRecord<number>(undefined)).toEqual({});
	});

	it('returns empty object for empty string', () => {
		expect(parseJsonRecord<number>('')).toEqual({});
	});

	it('returns empty object for a number array (wrong type)', () => {
		expect(parseJsonRecord<number>([1, 2, 3])).toEqual({});
	});

	it('returns empty object for invalid JSON string', () => {
		expect(parseJsonRecord<number>('not json')).toEqual({});
	});

	it('returns empty object for malformed JSON', () => {
		expect(parseJsonRecord<number>('{row1: 2')).toEqual({});
	});

	it('parses a valid JSON object string', () => {
		expect(parseJsonRecord<number>('{"1":2,"3":4}')).toEqual({ '1': 2, '3': 4 });
	});

	it('parses a single row-to-column mapping', () => {
		expect(parseJsonRecord<number>('{"5":10}')).toEqual({ '5': 10 });
	});

	it('returns null for JSON null string (parse result passed through)', () => {
		expect(parseJsonRecord<number>('null')).toBeNull();
	});

	it('returns parsed array for JSON array string (parse result passed through)', () => {
		expect(parseJsonRecord<number>('[1,2]')).toEqual([1, 2]);
	});
});
