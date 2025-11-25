import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFormEnhanceHandler } from './formErrorHandler';

describe('createFormEnhanceHandler', () => {
	let mockSetLoading: ReturnType<typeof vi.fn>;
	let mockSetError: ReturnType<typeof vi.fn>;
	let mockSetDialogOpen: ReturnType<typeof vi.fn>;
	let mockUpdate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockSetLoading = vi.fn();
		mockSetError = vi.fn();
		mockSetDialogOpen = vi.fn();
		mockUpdate = vi.fn().mockResolvedValue(undefined);
	});

	it('should set loading to true when form submission starts', () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading,
			setError: mockSetError
		});

		handler();

		expect(mockSetLoading).toHaveBeenCalledWith(true);
		expect(mockSetError).toHaveBeenCalledWith(null);
	});

	it('should handle failure result correctly', async () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading,
			setError: mockSetError,
			setDialogOpen: mockSetDialogOpen
		});

		const submitHandler = handler();
		const result = {
			type: 'failure' as const,
			data: { error: 'Custom error message' },
			status: 400
		};
		await submitHandler({ result, update: mockUpdate });

		expect(mockSetError).toHaveBeenCalledWith('Custom error message');
		expect(mockSetDialogOpen).toHaveBeenCalledWith(true);
		expect(mockSetLoading).toHaveBeenLastCalledWith(false);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('should use default server error message when no error in failure data', async () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading,
			setError: mockSetError
		});

		const submitHandler = handler();
		const result = { type: 'failure' as const, data: {}, status: 400 };
		await submitHandler({ result, update: mockUpdate });

		expect(mockSetError).toHaveBeenCalledWith('An error occurred. Please try again.');
	});

	it('should handle error result (network error) correctly', async () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading,
			setError: mockSetError,
			setDialogOpen: mockSetDialogOpen
		});

		const submitHandler = handler();
		const result = { type: 'error' as const, error: new Error('Network failed'), status: 500 };
		await submitHandler({ result, update: mockUpdate });

		expect(mockSetError).toHaveBeenCalledWith(
			'Something went wrong. Please check your connection and try again.'
		);
		expect(mockSetDialogOpen).toHaveBeenCalledWith(true);
		expect(mockSetLoading).toHaveBeenLastCalledWith(false);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('should handle success result correctly', async () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading,
			setError: mockSetError,
			setDialogOpen: mockSetDialogOpen
		});

		const submitHandler = handler();
		const result = { type: 'success' as const, data: { success: true }, status: 200 };
		await submitHandler({ result, update: mockUpdate });

		expect(mockSetError).toHaveBeenLastCalledWith(null);
		expect(mockUpdate).toHaveBeenCalled();
		expect(mockSetLoading).toHaveBeenLastCalledWith(false);
	});

	it('should handle redirect result as success', async () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading,
			setError: mockSetError
		});

		const submitHandler = handler();
		const result = { type: 'redirect' as const, location: '/new-page', status: 303 };
		await submitHandler({ result, update: mockUpdate });

		expect(mockSetError).toHaveBeenLastCalledWith(null);
		expect(mockUpdate).toHaveBeenCalled();
		expect(mockSetLoading).toHaveBeenLastCalledWith(false);
	});

	it('should use custom error messages when provided', async () => {
		const customNetworkError = 'Custom network error';
		const customServerError = 'Custom server error';

		const handler = createFormEnhanceHandler({
			setError: mockSetError,
			networkErrorMessage: customNetworkError,
			serverErrorMessage: customServerError
		});

		// Test network error
		const submitHandler1 = handler();
		await submitHandler1({
			result: { type: 'error' as const, error: new Error(''), status: 500 },
			update: mockUpdate
		});
		expect(mockSetError).toHaveBeenCalledWith(customNetworkError);

		// Test server error
		const submitHandler2 = handler();
		await submitHandler2({
			result: { type: 'failure' as const, data: {}, status: 400 },
			update: mockUpdate
		});
		expect(mockSetError).toHaveBeenCalledWith(customServerError);
	});

	it('should work with no options provided', () => {
		const handler = createFormEnhanceHandler();

		// Should not throw
		expect(() => handler()).not.toThrow();
	});

	it('should work with partial options', async () => {
		const handler = createFormEnhanceHandler({
			setLoading: mockSetLoading
			// setError and setDialogOpen are not provided
		});

		const submitHandler = handler();
		await submitHandler({
			result: { type: 'success' as const, data: {}, status: 200 },
			update: mockUpdate
		});

		expect(mockSetLoading).toHaveBeenCalledWith(true);
		expect(mockSetLoading).toHaveBeenLastCalledWith(false);
	});
});
