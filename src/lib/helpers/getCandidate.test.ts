import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCandidate } from './getCandidate';
import { createMockCookies, mockCandidate } from '$lib/test-utils';

describe('getCandidate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return parsed candidate when valid cookie exists', () => {
		const cookies = createMockCookies({
			'sashakt-candidate': JSON.stringify(mockCandidate)
		});

		const result = getCandidate(cookies as any);

		expect(result).toEqual(mockCandidate);
	});

	it('should return null when cookie does not exist', () => {
		const cookies = createMockCookies({});

		const result = getCandidate(cookies as any);

		expect(result).toBeNull();
	});

	it('should return null when cookie value is invalid JSON', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const cookies = createMockCookies({
			'sashakt-candidate': 'invalid-json-{{'
		});

		const result = getCandidate(cookies as any);

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith(
			'Failed to parse candidate cookie:',
			expect.any(SyntaxError)
		);

		consoleSpy.mockRestore();
	});

	it('should return null when cookie value is empty string', () => {
		const cookies = createMockCookies({
			'sashakt-candidate': ''
		});

		const result = getCandidate(cookies as any);

		// Empty string is falsy, so it should return null
		expect(result).toBeNull();
	});

	it('should handle cookie with valid but empty object', () => {
		const cookies = createMockCookies({
			'sashakt-candidate': JSON.stringify({})
		});

		const result = getCandidate(cookies as any);

		expect(result).toEqual({});
	});

	it('should correctly parse candidate with all fields', () => {
		const fullCandidate = {
			candidate_uuid: 'uuid-12345',
			candidate_test_id: 42
		};
		const cookies = createMockCookies({
			'sashakt-candidate': JSON.stringify(fullCandidate)
		});

		const result = getCandidate(cookies as any);

		expect(result).toEqual(fullCandidate);
		expect(result.candidate_uuid).toBe('uuid-12345');
		expect(result.candidate_test_id).toBe(42);
	});
});
