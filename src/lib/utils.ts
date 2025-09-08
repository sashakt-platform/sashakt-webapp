import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComponentType } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T extends HTMLElement = HTMLElement> = HTMLAttributes<T> & {
	ref?: T | null;
};

export type WithoutChild<T = object> = Omit<T, 'child'>;

export type WithoutChildrenOrChild<T = object> = Omit<T, 'children' | 'child'>;
