import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import QuestionMedia from './QuestionMedia.svelte';
import {
	mockImageMedia,
	mockYoutubeMedia,
	mockVimeoMedia,
	mockSpotifyMedia,
	mockGenericExternalMedia,
	mockImageAndExternalMedia,
	mockAudioMedia,
	mockAudioMediaByExtension
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

	describe('audio player', () => {
		it('should render the audio player for type:audio with no embed_url', () => {
			const { container } = render(QuestionMedia, { props: { media: mockAudioMedia } });

			expect(container.querySelector('audio')).toBeInTheDocument();
		});

		it('should render the audio player when URL has an audio file extension', () => {
			const { container } = render(QuestionMedia, { props: { media: mockAudioMediaByExtension } });

			expect(container.querySelector('audio')).toBeInTheDocument();
		});

		it('should render a play button', () => {
			render(QuestionMedia, { props: { media: mockAudioMedia } });

			expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
		});

		it('should render the seek range input', () => {
			const { container } = render(QuestionMedia, { props: { media: mockAudioMedia } });

			const range = container.querySelector('input[type="range"]');
			expect(range).toBeInTheDocument();
			expect(range).toHaveAttribute('min', '0');
			expect(range).toHaveAttribute('max', '100');
		});

		it('should render the time display', () => {
			render(QuestionMedia, { props: { media: mockAudioMedia } });

			expect(screen.getByText('00:00')).toBeInTheDocument();
		});

		it('should set the audio src from the media url', () => {
			const { container } = render(QuestionMedia, { props: { media: mockAudioMedia } });

			const audio = container.querySelector('audio');
			expect(audio).toHaveAttribute('src', mockAudioMedia.external_media!.url);
		});

		it('should have the correct gradient style on the seek bar', () => {
			const { container } = render(QuestionMedia, { props: { media: mockAudioMedia } });

			const range = container.querySelector('input[type="range"]');
			expect(range?.getAttribute('style')).toContain('linear-gradient');
		});

		it('should detect mp3 extension as audio', () => {
			const media = {
				image: null,
				external_media: { type: 'link', provider: 'generic', url: 'https://cdn.example.com/clip.mp3', embed_url: null, thumbnail_url: null }
			};
			const { container } = render(QuestionMedia, { props: { media } });
			expect(container.querySelector('audio')).toBeInTheDocument();
		});

		it('should detect ogg extension as audio', () => {
			const media = {
				image: null,
				external_media: { type: 'link', provider: 'generic', url: 'https://cdn.example.com/clip.ogg', embed_url: null, thumbnail_url: null }
			};
			const { container } = render(QuestionMedia, { props: { media } });
			expect(container.querySelector('audio')).toBeInTheDocument();
		});

		it('should not render audio player for Spotify — iframe takes priority', () => {
			const { container } = render(QuestionMedia, { props: { media: mockSpotifyMedia } });

			expect(container.querySelector('audio')).not.toBeInTheDocument();
			expect(container.querySelector('iframe')).toBeInTheDocument();
		});
	});
});
