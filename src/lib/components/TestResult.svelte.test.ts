import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import TestResult from './TestResult.svelte';
import {
	mockResultData,
	mockResultDataWithCertificate,
	mockSectionedTestQuestionsResponse,
	mockTestData,
	setLocaleForTests
} from '$lib/test-utils';

describe('TestResult', () => {
	it('should render success message', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
	});

	it('should render test name', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText(mockTestData.name)).toBeInTheDocument();
	});

	it('should render result summary when resultData is provided', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Result summary')).toBeInTheDocument();
		expect(screen.getByText('Correct Answers')).toBeInTheDocument();
		expect(screen.getByText('Incorrect Answers')).toBeInTheDocument();
		expect(screen.getByText('Not Attempted')).toBeInTheDocument();
	});

	it('should display correct answer counts', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		// Check that the result values are displayed
		expect(screen.getByText(String(mockResultData.correct_answer))).toBeInTheDocument();
		expect(screen.getByText(String(mockResultData.incorrect_answer))).toBeInTheDocument();
	});

	it('should display marks when available', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.getByText('Total marks obtained')).toBeInTheDocument();
		expect(screen.getByText('Total marks obtained').parentElement).toHaveTextContent(
			new RegExp(`${mockResultData.marks_obtained}\\s*/\\s*${mockResultData.marks_maximum}`)
		);
	});

	it('should not render result summary when resultData is null', () => {
		const testDetailsNoCompletion = {
			...mockTestData,
			completion_message: null
		};

		render(TestResult, {
			props: {
				resultData: null,
				testDetails: testDetailsNoCompletion
			}
		});

		expect(screen.queryByText('Result summary')).not.toBeInTheDocument();
		// Text is combined with "Congrats on completing the test!"
		expect(screen.getByText(/Your test has been submitted successfully/)).toBeInTheDocument();
	});

	it('should display custom completion message when provided', () => {
		const testDetailsWithMessage = {
			...mockTestData,
			completion_message: '<p>Great job completing the <strong>assessment</strong>!</p>'
		};

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: testDetailsWithMessage
			}
		});

		expect(
			screen.getByText((_, node) => node?.textContent?.trim() === 'Great job completing the assessment!')
		).toBeInTheDocument();
	});

	it('should display default message when no completion message', () => {
		const testDetailsNoMessage = {
			...mockTestData,
			completion_message: null
		};

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: testDetailsNoMessage
			}
		});

		// Default message mentions attempted questions
		expect(screen.getByText(/Congrats on completing the test!/)).toBeInTheDocument();
	});

	it('should calculate not attempted correctly', () => {
		// Total = 5 + 3 + 0 + 2 = 10
		// Attempted = 5 + 3 = 8
		// Not attempted = 10 - 8 = 2
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		// Find the "Not Attempted" row and check its value
		const notAttemptedCell = screen.getByText('Not Attempted');
		expect(notAttemptedCell).toBeInTheDocument();
	});

	it('should not show marks row when marks are null', () => {
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

		expect(screen.queryByText('Total marks obtained')).not.toBeInTheDocument();
	});
});

describe('TestResult - View Feedback button', () => {
	const mockFeedback = [
		{ question_revision_id: 1, submitted_answer: [101], correct_answer: [102] }
	];

	it('should show View Feedback button when show_feedback_on_completion is true and feedback exists', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback
			}
		});

		expect(screen.getByText('View Result')).toBeInTheDocument();
	});

	it('should NOT show View Feedback button when show_feedback_on_completion is false', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: false };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: mockFeedback
			}
		});

		expect(screen.queryByText('View Result')).not.toBeInTheDocument();
	});

	it('should NOT show View Feedback button when feedback is null', () => {
		const testDetails = { ...mockTestData, show_feedback_on_completion: true };

		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails,
				feedback: null
			}
		});

		expect(screen.queryByText('View Result')).not.toBeInTheDocument();
	});

	it('should NOT show View Feedback button when neither prop is provided', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData
			}
		});

		expect(screen.queryByText('View Result')).not.toBeInTheDocument();
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

		const button = screen.getByText('View Result');
		await fireEvent.click(button);

		expect(onViewFeedback).toHaveBeenCalledOnce();
	});
});

describe('TestResult - Section summary', () => {
	it('should render section-wise summary on final result page for sectioned tests', () => {
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: mockTestData,
				testQuestions: mockSectionedTestQuestionsResponse,
				feedback: [
					{ question_revision_id: 1, submitted_answer: [101], correct_answer: [102] },
					{ question_revision_id: 2, submitted_answer: [201], correct_answer: [201, 202] }
				]
			}
		});

		expect(screen.getByText('Section summary')).toBeInTheDocument();
		expect(screen.getByText('Physics')).toBeInTheDocument();
		expect(screen.getByText('Chemistry')).toBeInTheDocument();
		expect(screen.getAllByText('Questions').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Attempted').length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Allowed:/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Accuracy:/).length).toBeGreaterThan(0);
	});
});

describe('support for localization', () => {
	it('should render result in Hindi', async () => {
		await setLocaleForTests('hi-IN');

		const resultTestData = {
			...mockTestData,
			completion_message: null
		};
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: resultTestData
			}
		});

		await waitFor(() => {
			// expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
			expect(screen.getByText('सफलतापूर्वक जमा किया गया')).toBeInTheDocument();
			expect(
				screen.getByText(
					'परीक्षा सफलतापूर्वक पूरी करने पर बधाई! आपने 8 प्रश्नों का प्रयास किया है।'
				)
			).toBeInTheDocument();
			expect(screen.getByText('परिणाम सारांश')).toBeInTheDocument();
			expect(screen.getByText('सही उत्तर')).toBeInTheDocument();
			expect(screen.getByText('गलत उत्तर')).toBeInTheDocument();
			expect(screen.getByText('प्रयास नहीं किया')).toBeInTheDocument();
			expect(screen.getByText('कुल प्राप्त अंक')).toBeInTheDocument();
		});
	});

	it('should render Test in English', async () => {
		await setLocaleForTests('en-US');

		const resultTestData = {
			...mockTestData,
			completion_message: null
		};
		render(TestResult, {
			props: {
				resultData: mockResultData,
				testDetails: resultTestData
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Submitted Successfully')).toBeInTheDocument();
			expect(screen.getByText(/Congrats on completing the test!/i)).toBeInTheDocument();

			expect(screen.getByText(/You have attempted 8 questions\./i)).toBeInTheDocument();
			expect(screen.getByText('Result summary')).toBeInTheDocument();
			expect(screen.getByText('Correct Answers')).toBeInTheDocument();
			expect(screen.getByText('Incorrect Answers')).toBeInTheDocument();
			expect(screen.getByText('Not Attempted')).toBeInTheDocument();
			expect(screen.getByText('Total marks obtained')).toBeInTheDocument();
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
