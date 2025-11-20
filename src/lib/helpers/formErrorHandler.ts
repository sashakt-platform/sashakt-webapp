import type { ActionResult } from '@sveltejs/kit';

/**
 * createFormEnhanceHandler interface for options
 */
export interface FormEnhanceOptions {
	/** function to set loading state */
	setLoading?: (loading: boolean) => void;
	/** function to set error message */
	setError?: (error: string | null) => void;
	/** function to control dialog open state (keep dialog open on error) */
	setDialogOpen?: (open: boolean) => void;
	/** custom error message for network/connection errors */
	networkErrorMessage?: string;
	/** custom error message for server errors */
	serverErrorMessage?: string;
}

/**
 * Create a form enhance handler for consistent error handling
 */
export function createFormEnhanceHandler(options: FormEnhanceOptions = {}) {
	const {
		setLoading,
		setError,
		setDialogOpen,
		networkErrorMessage = 'Something went wrong. Please check your connection and try again.',
		serverErrorMessage = 'An error occurred. Please try again.'
	} = options;

	return () => {
		// set loading state immediately when form submission starts
		setLoading?.(true);
		setError?.(null);

		return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
			if (result.type === 'failure') {
				// server returned an error/failure
				const errorMsg = (result.data as any)?.error || serverErrorMessage;
				setError?.(errorMsg);
				setDialogOpen?.(true);
				setLoading?.(false);
			} else if (result.type === 'error') {
				// network error or other error
				setError?.(networkErrorMessage);
				setDialogOpen?.(true);
				setLoading?.(false);
			} else {
				// success
				setError?.(null);
				await update();
				setLoading?.(false);
			}
		};
	};
}
