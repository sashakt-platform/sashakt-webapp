import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import TestResult from './TestResult.svelte';
import {
	mockResultData,
	mockResultDataWithCertificate,
	mockTestData,
	setLocaleForTests
} from '$lib/test-utils';

describe('TestResult', () => {
	it('should render test name with Submitted label', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText(/Submitted/)).toBeInTheDocument();
		expect(screen.getByText(new RegExp(mockTestData.name))).toBeInTheDocument();
	});

	it('should render score when marks are available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(
			screen.getByText(`${mockResultData.marks_obtained}/${mockResultData.marks_maximum}`)
		).toBeInTheDocument();
		expect(screen.getByText('Your Score')).toBeInTheDocument();
	});

	it('should render correct/incorrect/unanswered rows', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Correct')).toBeInTheDocument();
		expect(screen.getByText('Incorrect')).toBeInTheDocument();
		expect(screen.getByText('Unanswered')).toBeInTheDocument();
	});

	it('should display zero-padded answer counts', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		const correct = String(mockResultData.correct_answer).padStart(2, '0');
		const incorrect = String(mockResultData.incorrect_answer).padStart(2, '0');
		expect(screen.getByText(correct)).toBeInTheDocument();
		expect(screen.getByText(incorrect)).toBeInTheDocument();
	});

	it('should not show score when marks are null', () => {
		const resultWithoutMarks = {
			...mockResultData,
			marks_obtained: null,
			marks_maximum: null
		};

		render(TestResult, {
			props: {
				resultData: resultWithoutMarks,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('Your Score')).not.toBeInTheDocument();
	});

	it('should not render stats when resultData is null', () => {
		render(TestResult, {
			props: {
				resultData: null,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('Correct')).not.toBeInTheDocument();
		expect(screen.queryByText('Unanswered')).not.toBeInTheDocument();
	});

	it('should display custom completion message when provided', () => {
		const testDetailsWithMessage = {
			...mockTestData,
			completion_message: 'Great job completing the assessment!'
		};

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: testDetailsWithMessage
			}
		});

		expect(screen.getByText('Great job completing the assessment!')).toBeInTheDocument();
	});

	it('should not display completion message when none provided', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: { ...mockTestData, completion_message: null }
			}
		});

		expect(screen.queryByText('Test completion message will be shown here.')).not.toBeInTheDocument();
	});
});

describe('TestResult - View Feedback button', () => {
	const mockFeedback = [
		{ question_revision_id: 1, submitted_answer: [101], correct_answer: [102] }
	];

	it('should show View All Answers button when show_feedback_on_completion is true and feedback exists', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback
			}
		});

		expect(screen.getByText('View All Answers')).toBeInTheDocument();
	});

	it('should NOT show View All Answers button when show_feedback_on_completion is false', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: false };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback
			}
		});

		expect(screen.queryByText('View All Answers')).not.toBeInTheDocument();
	});

	it('should NOT show View All Answers button when feedback is null', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: null
			}
		});

		expect(screen.queryByText('View All Answers')).not.toBeInTheDocument();
	});

	it('should NOT show View All Answers button when neither prop is provided', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('View All Answers')).not.toBeInTheDocument();
	});

	it('should call onViewFeedback when button is clicked', async () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };
		const onViewFeedback = vi.fn();

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback,
				onViewFeedback
			}
		});

		const button = screen.getByText('View All Answers');
		await fireEvent.click(button);

		expect(onViewFeedback).toHaveBeenCalledOnce();
	});
});

describe('support for localization', () => {
	it('should render result in Hindi', async () => {
		await setLocaleForTests('hi-IN');

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: { ...mockTestData, completion_message: null }
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/जमा किया/)).toBeInTheDocument();
			expect(screen.getByText('सही')).toBeInTheDocument();
			expect(screen.getByText('गलत')).toBeInTheDocument();
			expect(screen.getByText('अनुत्तरित')).toBeInTheDocument();
		});
	});

	it('should render Test in English', async () => {
		await setLocaleForTests('en-US');

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: { ...mockTestData, completion_message: null }
			}
		});

		await waitFor(() => {
			expect(screen.getByText(/Submitted/)).toBeInTheDocument();
			expect(screen.getByText('Correct')).toBeInTheDocument();
			expect(screen.getByText('Incorrect')).toBeInTheDocument();
			expect(screen.getByText('Unanswered')).toBeInTheDocument();
			expect(screen.getByText('Your Score')).toBeInTheDocument();
		});
	});
});

describe('Certificate download', () => {
	it('should show download button when certificate URL is available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Download Certificate')).toBeInTheDocument();
	});

	it('should not show download button when certificate URL is not available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('Download Certificate')).not.toBeInTheDocument();
	});
});

describe('handleDownloadCertificate', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		vi.stubGlobal('URL', {
			createObjectURL: vi.fn(() => 'blob:mock-url'),
			revokeObjectURL: vi.fn()
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('should not call fetch when certificate_download_url is missing', async () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(fetch).not.toHaveBeenCalled();
	});

	it('should call fetch with correct URL, method, and body on click', async () => {
		const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(mockBlob)
		} as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		await fireEvent.click(screen.getByText('Download Certificate'));

		expect(fetch).toHaveBeenCalledWith('/api/download-certificate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				certificate_download_url: mockResultDataWithCertificate.certificate_download_url
			})
		});
	});

	it('should show spinner and "Preparing..." text while downloading', async () => {
		let resolveBlob: (blob: Blob) => void;
		const blobPromise = new Promise<Blob>((resolve) => {
			resolveBlob = resolve;
		});

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			blob: () => blobPromise
		} as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(screen.getByText('Preparing...')).toBeInTheDocument();
		});

		resolveBlob!(new Blob());
	});

	it('should disable the button while downloading', async () => {
		let resolveBlob: (blob: Blob) => void;
		const blobPromise = new Promise<Blob>((resolve) => {
			resolveBlob = resolve;
		});

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			blob: () => blobPromise
		} as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /Preparing/i })).toBeDisabled();
		});

		resolveBlob!(new Blob());
	});

	it('should create and click an anchor element with the correct filename', async () => {
		const mockBlob = new Blob(['content']);
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(mockBlob)
		} as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		const mockAnchor = { href: '', download: '', click: vi.fn() };
		const origCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
			if (tag === 'a') return mockAnchor as unknown as HTMLElement;
			return origCreateElement(tag);
		});
		vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchor as unknown as Node);
		vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchor as unknown as Node);

		await fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(mockAnchor.click).toHaveBeenCalled();
			expect(mockAnchor.href).toBe('blob:mock-url');
			expect(mockAnchor.download).toBe(`certificate-${mockTestData.name.replace(/\s+/g, '-')}.png`);
		});
	});

	it('should revoke the object URL after download completes', async () => {
		const mockBlob = new Blob(['content']);
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(mockBlob)
		} as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		const mockAnchorRevoke = { href: '', download: '', click: vi.fn() };
		const origCreateElement2 = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
			if (tag === 'a') return mockAnchorRevoke as unknown as HTMLElement;
			return origCreateElement2(tag);
		});
		vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchorRevoke as unknown as Node);
		vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchorRevoke as unknown as Node);

		await fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
		});
	});

	it('should show error message when response is not ok', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			blob: vi.fn()
		} as unknown as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		await fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(
				screen.getByText('Failed to download certificate. Please try again.')
			).toBeInTheDocument();
		});
	});

	it('should show error message when fetch throws a network error', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		await fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(
				screen.getByText('Failed to download certificate. Please try again.')
			).toBeInTheDocument();
		});
	});

	it('should re-enable the button and restore label after a successful download', async () => {
		const mockBlob = new Blob(['content']);
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			blob: () => Promise.resolve(mockBlob)
		} as Response);

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		const mockAnchorRestore = { href: '', download: '', click: vi.fn() };
		const origCreateElement3 = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
			if (tag === 'a') return mockAnchorRestore as unknown as HTMLElement;
			return origCreateElement3(tag);
		});
		vi.spyOn(document.body, 'appendChild').mockReturnValue(mockAnchorRestore as unknown as Node);
		vi.spyOn(document.body, 'removeChild').mockReturnValue(mockAnchorRestore as unknown as Node);

		await fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(screen.getByText('Download Certificate')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Download Certificate' })).not.toBeDisabled();
		});
	});

	it('should re-enable the button and show error after a failed download', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

		render(TestResult, {
			props: {
				resultData: mockResultDataWithCertificate,
				testDetails: mockTestData
			}
		});

		await fireEvent.click(screen.getByText('Download Certificate'));

		await waitFor(() => {
			expect(
				screen.getByText('Failed to download certificate. Please try again.')
			).toBeInTheDocument();
			expect(screen.getByRole('button')).not.toBeDisabled();
		});
	});
});
