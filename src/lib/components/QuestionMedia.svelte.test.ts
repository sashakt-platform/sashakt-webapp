import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QuestionMedia from './QuestionMedia.svelte';
import {
	mockImageMedia,
	mockYoutubeMedia,
	mockVimeoMedia,
	mockSpotifyMedia,
	mockGenericExternalMedia,
	mockImageAndExternalMedia
} from '$lib/test-utils';

describe('QuestionMedia', () => {
	describe('when media is absent', () => {
		it('should render nothing when media is null', () => {
			const { container } = render(QuestionMedia, { props: { media: null } });
			expect(container.innerHTML).toBe('<!---->');
		});

		it('should render nothing when media is undefined', () => {
			const { container } = render(QuestionMedia, { props: { media: undefined } });
			expect(container.innerHTML).toBe('<!---->');
		});

		it('should render nothing when media has no image and no external_media', () => {
			const { container } = render(QuestionMedia, {
				props: { media: { image: null, external_media: null } }
			});
			expect(container.innerHTML).toBe('<!---->');
		});
	});

	describe('image media', () => {
		it('should render an image when media.image.url is present', () => {
			render(QuestionMedia, { props: { media: mockImageMedia } });

			const img = screen.getByRole('img');
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute('src', mockImageMedia.image!.url);
		});

		it('should use alt_text from media for the image', () => {
			render(QuestionMedia, { props: { media: mockImageMedia } });

			const img = screen.getByRole('img');
			expect(img).toHaveAttribute('alt', 'A diagram showing the question');
		});

		it('should use fallback alt text when alt_text is not provided', () => {
			const mediaNoAlt = {
				image: { ...mockImageMedia.image!, alt_text: undefined },
				external_media: null
			};

			render(QuestionMedia, { props: { media: mediaNoAlt } });

			const img = screen.getByRole('img');
			expect(img).toHaveAttribute('alt', 'Question image');
		});

		it('should have lazy loading attribute', () => {
			render(QuestionMedia, { props: { media: mockImageMedia } });

			const img = screen.getByRole('img');
			expect(img).toHaveAttribute('loading', 'lazy');
		});
	});

	describe('embeddable external media', () => {
		it('should render an iframe for YouTube embed', () => {
			const { container } = render(QuestionMedia, { props: { media: mockYoutubeMedia } });

			const iframe = container.querySelector('iframe');
			expect(iframe).toBeInTheDocument();
			expect(iframe).toHaveAttribute('src', mockYoutubeMedia.external_media!.embed_url);
			expect(iframe).toHaveAttribute('title', 'youtube');
		});

		it('should render an iframe for Vimeo embed', () => {
			const { container } = render(QuestionMedia, { props: { media: mockVimeoMedia } });

			const iframe = container.querySelector('iframe');
			expect(iframe).toBeInTheDocument();
			expect(iframe).toHaveAttribute('src', mockVimeoMedia.external_media!.embed_url);
			expect(iframe).toHaveAttribute('title', 'vimeo');
		});

		it('should render an iframe for Spotify embed', () => {
			const { container } = render(QuestionMedia, { props: { media: mockSpotifyMedia } });

			const iframe = container.querySelector('iframe');
			expect(iframe).toBeInTheDocument();
			expect(iframe).toHaveAttribute('src', mockSpotifyMedia.external_media!.embed_url);
			expect(iframe).toHaveAttribute('title', 'spotify');
		});

		it('should use fixed height for Spotify (not aspect-ratio)', () => {
			const { container } = render(QuestionMedia, { props: { media: mockSpotifyMedia } });

			const wrapper = container.querySelector('iframe')?.parentElement;
			expect(wrapper?.getAttribute('style')).toContain('height: 152px');
		});

		it('should use 16:9 aspect ratio for YouTube', () => {
			const { container } = render(QuestionMedia, { props: { media: mockYoutubeMedia } });

			const wrapper = container.querySelector('iframe')?.parentElement;
			expect(wrapper?.getAttribute('style')).toContain('aspect-ratio: 16/9');
		});

		it('should have sandbox attribute on iframe', () => {
			const { container } = render(QuestionMedia, { props: { media: mockYoutubeMedia } });

			const iframe = container.querySelector('iframe');
			expect(iframe).toHaveAttribute(
				'sandbox',
				'allow-scripts allow-same-origin allow-presentation'
			);
		});
	});

	describe('non-embeddable external media', () => {
		it('should render a link for generic external media', () => {
			render(QuestionMedia, { props: { media: mockGenericExternalMedia } });

			const link = screen.getByRole('link');
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', mockGenericExternalMedia.external_media!.url);
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		});

		it('should display "External media" text for generic provider', () => {
			render(QuestionMedia, { props: { media: mockGenericExternalMedia } });

			expect(screen.getByText('External media')).toBeInTheDocument();
		});

		it('should display provider name for non-generic providers without embed_url', () => {
			const nonEmbeddableYoutube = {
				image: null,
				external_media: {
					type: 'video',
					provider: 'dailymotion',
					url: 'https://dailymotion.com/video/abc',
					embed_url: null,
					thumbnail_url: null
				}
			};

			render(QuestionMedia, { props: { media: nonEmbeddableYoutube } });

			expect(screen.getByText('dailymotion')).toBeInTheDocument();
		});
	});

	describe('combined image and external media', () => {
		it('should render both image and iframe when both are present', () => {
			const { container } = render(QuestionMedia, { props: { media: mockImageAndExternalMedia } });

			const img = screen.getByRole('img');
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute('src', mockImageAndExternalMedia.image!.url);

			const iframe = container.querySelector('iframe');
			expect(iframe).toBeInTheDocument();
			expect(iframe).toHaveAttribute('src', mockImageAndExternalMedia.external_media!.embed_url);
		});
	});
});
