import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	enumerable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] || null)
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock ResizeObserver
class ResizeObserverMock {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
	value: ResizeObserverMock
});

// Mock IntersectionObserver
class IntersectionObserverMock {
	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
	}
	callback: IntersectionObserverCallback;
	root = null;
	rootMargin = '';
	thresholds = [];
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
	takeRecords = vi.fn(() => []);
}

Object.defineProperty(window, 'IntersectionObserver', {
	value: IntersectionObserverMock
});

// Reset mocks before each test
beforeEach(() => {
	localStorageMock.clear();
	vi.clearAllMocks();
});
