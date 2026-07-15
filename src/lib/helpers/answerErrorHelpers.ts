export const SECTION_LIMIT_ERROR_PREFIX = 'Maximum attempt limit reached for section';

export const isSectionLimitError = (message: string | null | undefined): boolean =>
	message?.includes(SECTION_LIMIT_ERROR_PREFIX) ?? false;

export const getErrorMessage = (error: unknown, fallback: string): string =>
	error instanceof Error && error.message ? error.message : fallback;

// Each answer component holds its own local `saveError` $state (Svelte 5 runes
// can't be shared across modules), so this takes a setter and returns a
// same-shaped `setTransientSaveError(error, fallback)` that writes through it.
export const createTransientSaveError = (setSaveError: (value: string | null) => void) => {
	return (error: unknown, fallback: string) => {
		setSaveError(getErrorMessage(error, fallback));
		setTimeout(() => setSaveError(null), 5000);
	};
};

export const hasAttemptedResponse = (response: string | number[] | undefined | null): boolean => {
	if (typeof response === 'string') return response.trim().length > 0;
	return (response?.length ?? 0) > 0;
};
