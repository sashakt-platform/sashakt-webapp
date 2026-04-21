import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
	darkMode: ['class'],
	content: ['./src/**/*.{html,js,svelte,ts}'],
	safelist: ['dark'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border) / <alpha-value>)',
				input: 'hsl(var(--input) / <alpha-value>)',
				ring: 'hsl(var(--ring) / <alpha-value>)',
				background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
				primary: {
					DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
					foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
					foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
					foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
					foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
					foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
					foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
				},
				card: {
					DEFAULT: 'hsl(var(--card) / <alpha-value>)',
					foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
				},
				'section-header': 'hsl(var(--section-header-bg) / <alpha-value>)',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				/* Brand colors */
				brand: {
					DEFAULT: 'hsl(var(--brand-primary) / <alpha-value>)',
					dark: 'hsl(var(--brand-dark) / <alpha-value>)',
					light: 'hsl(var(--brand-light) / <alpha-value>)',
					subtle: 'hsl(var(--brand-subtle) / <alpha-value>)'
				},
				/* Neutral grays */
				gray: {
					800: 'hsl(var(--gray-800) / <alpha-value>)',
					500: 'hsl(var(--gray-500) / <alpha-value>)',
					400: 'hsl(var(--gray-400) / <alpha-value>)',
					300: 'hsl(var(--gray-300) / <alpha-value>)',
					200: 'hsl(var(--gray-200) / <alpha-value>)',
					50: 'hsl(var(--gray-50) / <alpha-value>)',
					0: 'hsl(var(--gray-0) / <alpha-value>)'
				},
				/* Semantic colors */
				success: {
					DEFAULT: 'hsl(var(--success-bold) / <alpha-value>)',
					subtle: 'hsl(var(--success-subtle) / <alpha-value>)'
				},
				error: {
					DEFAULT: 'hsl(var(--error-bold) / <alpha-value>)',
					subtle: 'hsl(var(--error-subtle) / <alpha-value>)'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning-bold) / <alpha-value>)',
					subtle: 'hsl(var(--warning-subtle) / <alpha-value>)'
				}
			},
			borderRadius: {
				xl: 'calc(var(--radius) + 4px)',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['"Open Sans"', 'sans-serif']
			},
			fontSize: {
				'label-xs': ['0.75rem', { lineHeight: '1.4', fontWeight: '700' }],
				'label-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '700' }],
				'body-xs': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
				'body-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
				'body-sm-light': ['0.875rem', { lineHeight: '1.4', fontWeight: '300' }],
				'title-xs': ['0.75rem', { lineHeight: '1.4', fontWeight: '600' }],
				'title-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }],
				'title-lg': ['1rem', { lineHeight: '1.4', fontWeight: '700' }],
				'display-xs': ['1.25rem', { lineHeight: '1.4', fontWeight: '700' }],
				'display-sm': ['1.5rem', { lineHeight: '1.4', fontWeight: '700' }]
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--bits-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--bits-accordion-content-height)' },
					to: { height: '0' }
				},
				'caret-blink': {
					'0%,70%,100%': { opacity: '1' },
					'20%,50%': { opacity: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'caret-blink': 'caret-blink 1.25s ease-out infinite'
			}
		}
	},
	plugins: [tailwindcssAnimate]
};

export default config;
