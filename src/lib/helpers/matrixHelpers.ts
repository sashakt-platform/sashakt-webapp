export const parseJsonRecord = <T>(response: number[] | string | undefined): Record<string, T> => {
	if (typeof response !== 'string' || !response) return {};
	try {
		return JSON.parse(response) as Record<string, T>;
	} catch {
		return {};
	}
};

export const normalizeMatrixInputValues = (
	values: Record<string, string>
): Record<string, string> =>
	Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim().length > 0));
