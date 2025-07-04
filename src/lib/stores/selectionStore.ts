// src/stores/localStorageStore.js
import type { TSelection } from '$lib/types';
import { writable } from 'svelte/store';

export function localStorageStore(key: string, initialValue: TSelection[]) {
	let storedValue;
	const isLocalStorageAvailable = typeof Storage !== 'undefined';

	try {
		const json = isLocalStorageAvailable ? localStorage.getItem(key) : null;
		storedValue = json ? JSON.parse(json) : initialValue;
	} catch {
		storedValue = initialValue;
	}

	const store = writable(storedValue);

	// Persist changes
	const unsubscribe = store.subscribe((value) => {
		if (!isLocalStorageAvailable) return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			console.error(`Could not write ${key} to localStorage`);
		}
	});

	return {
		...store,
		destroy: unsubscribe
	};
}

export const selections = localStorageStore('sashakt-selections', []);
