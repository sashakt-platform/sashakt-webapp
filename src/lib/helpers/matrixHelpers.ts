export const parseMatrixResponse = (response: number[] | string | undefined): Record<string, number> => {
	if (typeof response !== 'string' || !response) return {};
	try {
		return JSON.parse(response);
	} catch {
		return {};
	}
};
