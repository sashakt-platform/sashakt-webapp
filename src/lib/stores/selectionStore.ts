// src/stores/localStorageStore.js
import type { TSelection } from '$lib/types';
import { writable } from 'svelte/store';

export function localStorageStore(key: string, initialValue: TSelection[]) {
	let storedValue;

	try {
		const json = localStorage.getItem(key);
		storedValue = json ? JSON.parse(json) : initialValue;
	} catch (err) {
		storedValue = initialValue;
	}

	const store = writable(storedValue);

	// Persist changes
	store.subscribe((value) => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (err) {
			console.error(`Could not write ${key} to localStorage`, err);
		}
	});

	return store;
}

export const selections = localStorageStore('sashakt-selections', []);
