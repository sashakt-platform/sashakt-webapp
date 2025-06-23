import type { Cookies } from '@sveltejs/kit';

export const getCandidate = (cookies: Cookies) => {
	const candidateCookie = cookies.get('sashakt-candidate');
	let candidate = null;
	if (candidateCookie) {
		candidate = JSON.parse(candidateCookie);
	}
	return candidate;
};
