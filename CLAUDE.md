# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sashakt Webapp is a test-taking frontend for the Sashakt platform. Candidates register, take tests (single/multi-choice, subjective, numerical), and view results with certificates. Supports English and Hindi.

## Commands

```bash
pnpm run dev              # Start dev server
pnpm run build            # Production build
pnpm run check            # TypeScript + svelte-check
pnpm run lint             # Prettier check + ESLint
pnpm run format           # Auto-format with Prettier
pnpm run test:unit        # Run Vitest (watch mode by default)
pnpm run test:unit -- --run                    # Run once and exit
pnpm run test:unit -- --run src/path/file.test.ts  # Run a single test file
pnpm run test:e2e         # Playwright e2e tests (requires build first)
pnpm run i18n:extract     # Extract i18n strings from Svelte files into locale JSONs
```

## Tech Stack

- **SvelteKit 5** (Svelte 5 with `$state`/`$derived`/`$effect` runes) + TypeScript
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin, not PostCSS)
- **bits-ui** for UI primitives (Dialog, Combobox, Select, etc.)
- **svelte-i18n** for internationalization (en-US, hi-IN)
- **@sentry/sveltekit** for error tracking
- **pnpm** as package manager
- **Vitest** for unit tests, **Playwright** for e2e
- **@sveltejs/adapter-node** for production deployment

## Architecture

### API Proxy Pattern

The backend (FastAPI) URL is kept server-only via `$env/static/private`. All client-to-backend communication goes through SvelteKit API proxy routes:

```
Browser → /api/* (SvelteKit server routes) → BACKEND_URL (FastAPI)
```

Backend fetch wrappers live in `src/lib/server/test.ts`. API proxy routes are in `src/routes/api/`.

### Main Test Flow (`/test/[slug]`)

The test page is a state machine in `src/routes/test/[slug]/+page.svelte` with these views:

1. **LandingPage** - Test intro and instructions
2. **DynamicForm** - Candidate registration (if test has a form)
3. **CandidateProfile** - OMR mode selection (if optional)
4. **OmrSheet** or **Question** - Test questions
5. **TestResult** - Results and certificate download
6. **ViewFeedback** - Answer review (if enabled)

Server-side data loading happens in `+page.server.ts`. The `hooks.server.ts` middleware fetches test details by slug and sets `event.locals.testData`.

### Session Management

Candidate identity is stored in a `sashakt-candidate` cookie (contains `candidate_uuid` and `candidate_test_id`). Parsed by `src/lib/helpers/getCandidate.ts`. API routes validate the cookie matches request parameters.

### Form System

`DynamicForm` → `FormField` → specific field component (11 types in `src/lib/components/form/fields/`). Validation logic is in `validation.ts`. Form responses are collected in the parent and submitted via SvelteKit form actions.

### Test Configuration

Vitest uses two test projects configured in `vite.config.ts`:

- **client**: `*.svelte.test.ts` files, jsdom environment, setup in `vitest-setup-client.ts`
- **server**: `*.test.ts` files (excluding `.svelte.`), node environment

### i18n

Locale files are in `src/locales/`. Use `$t('key')` for translations. For tests, use `initializeI18nForTests()` and `setLocaleForTests()` from `src/lib/test-utils.ts`. The `$locales` path alias points to `src/locales`.

## Key Types

Core types are in `src/lib/types.ts`:

- `TQuestion` - Question with options, type, marking scheme (supports partial marks)
- `TSelection` - Candidate's answer state per question
- `TTestSession` - Candidate + selections + current page
- `question_type_enum` - SINGLE, MULTIPLE, SUBJECTIVE, NUMERICALINTEGER, NUMERICALDECIMAL
- `TFormField` / `TForm` - Dynamic form field definitions

## Environment Variables

- `BACKEND_URL` (private, server-only) - FastAPI backend URL
- `PUBLIC_APP_ENV` (public) - Environment name (development/staging/production)

## Svelte 5 Gotchas

- Never use `$effect` with a condition that checks reactive state modified by an async function it calls — causes infinite loops. Use a boolean flag instead.
- `$state` array reassignment (even `arr = []`) creates a new reference and triggers reactive updates.
- bits-ui Combobox `inputValue` is not `$bindable()` — use one-way prop + `oninput` listener.

## Known Issues

Pre-existing type errors in `vite.config.ts`, `select-label.svelte`, `CandidateProfile.svelte` — these can be ignored.

## Imports

Always use top-level imports (not dynamic imports inside functions unless specifically needed for code splitting).

## Conventions

- Use top-level imports (not inline/dynamic imports unless necessary)
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.)
- Create plan/tracking files in the `plans/` folder (gitignored), never in the project root. Never delete plan files.
- Never hardcode colors (e.g., `text-gray-600`, `bg-blue-500`). Use theme tokens defined in `app.css` (e.g., `text-muted-foreground`, `bg-primary`, `border-border`).
