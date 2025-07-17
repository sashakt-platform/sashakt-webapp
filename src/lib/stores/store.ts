import type { TSelection } from '$lib/types';
import { LocalStorage } from './localStorage.svelte';

export const selectionStore = new LocalStorage<TSelection[]>('sashakt-answers', []);
export const pageStore = new LocalStorage<number>('sashakt-test-page', 1);
