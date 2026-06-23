import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/svelte';
import BottomSheetModal from './BottomSheetModal.svelte';
import { initializeI18nForTests } from '$lib/test-utils';
import type { Snippet } from 'svelte';

const emptySnippet: Snippet = (() => {}) as unknown as Snippet;

describe('BottomSheetModal', () => {
	beforeEach(() => {
		initializeI18nForTests();
	});

	it('renders the dialog when open is true', () => {
		render(BottomSheetModal, {
			props: { open: true, title: 'Test Title', children: emptySnippet }
		});

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('does not render dialog content when open is false', () => {
		render(BottomSheetModal, {
			props: { open: false, title: 'Test Title', children: emptySnippet }
		});

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('displays the title in the header', () => {
		render(BottomSheetModal, {
			props: { open: true, title: 'My Modal Title', children: emptySnippet }
		});

		// Title renders in both the sr-only Dialog.Title and the visible h2
		const matches = screen.getAllByText('My Modal Title');
		expect(matches.length).toBeGreaterThan(0);
	});

	it('displays a close button', () => {
		render(BottomSheetModal, {
			props: { open: true, title: 'Test Title', children: emptySnippet }
		});

		expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
	});

	it('closes the modal when close button is clicked', async () => {
		render(BottomSheetModal, {
			props: { open: true, title: 'Test Title', children: emptySnippet }
		});

		await fireEvent.click(screen.getByRole('button', { name: /close/i }));

		await waitFor(() => {
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});
	});
});
