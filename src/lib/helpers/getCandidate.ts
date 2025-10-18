import type { Cookies } from '@sveltejs/kit';

export const getCandidate = (cookies: Cookies) => {
	const candidateCookie = cookies.get('sashakt-candidate');
	let candidate = null;
	if (candidateCookie) {
		try {
			candidate = JSON.parse(candidateCookie);
		} catch (error) {
			console.error('Failed to parse candidate cookie:', error);
		}
	}
	return candidate;
};
