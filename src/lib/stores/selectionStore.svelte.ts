import type { TSelection } from '$lib/types';

export class LocalStorage<T> {
	#key: string;

	constructor(key: string, initial: T) {
		this.#key = key;

		if (typeof localStorage !== 'undefined') {
			if (localStorage.getItem(key) === null) {
				try {
					localStorage.setItem(key, JSON.stringify(initial));
				} catch (error) {
					console.error(`Failed to initialize localStorage for key "${key}":`, error);
				}
			}
		}
	}

	get current(): T {
		let root: T;
		if (typeof localStorage !== 'undefined') {
			try {
				const stored = localStorage.getItem(this.#key);
				root = stored ? JSON.parse(stored) : ([] as T);
			} catch (error) {
				console.error(`Failed to parse localStorage for key "${this.#key}":`, error);
				root = [] as T;
			}
		} else {
			root = [] as T;
		}

		const proxies = new WeakMap();

		const proxy = (value: any): any => {
			if (typeof value !== 'object' || value === null) return value;

			let p = proxies.get(value);
			if (!p) {
				p = new Proxy(value, {
					get: (target, property) => {
						return proxy(Reflect.get(target, property));
					},
					set: (target, property, val) => {
						Reflect.set(target, property, val);
						if (typeof localStorage !== 'undefined') {
							try {
								localStorage.setItem(this.#key, JSON.stringify(root));
							} catch (error) {
								console.error(`Failed to update localStorage for key "${this.#key}":`, error);
							}
						}
						return true;
					}
				});
				proxies.set(value, p);
			}
			return p;
		};

		return proxy(root);
	}

	set current(value: T) {
		if (typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(this.#key, JSON.stringify(value));
			} catch (error) {
				console.error(`Failed to set localStorage for key "${this.#key}":`, error);
				throw error;
			}
		}
	}
}

export const selections = new LocalStorage<TSelection[]>('sashakt-answers', []);
