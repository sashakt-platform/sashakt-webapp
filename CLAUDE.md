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

- **SvelteKit 3** on **Svelte 5** (`$state`/`$derived`/`$effect` runes) + TypeScript, built with **Vite 8**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin, not PostCSS)
- **bits-ui** for UI primitives (Dialog, Combobox, Select, etc.)
- **svelte-i18n** for internationalization (en-US, hi-IN)
- **@sentry/sveltekit** for error tracking
- **pnpm** as package manager
- **Vitest 5** for unit tests, **Playwright** for e2e
- **@sveltejs/adapter-node** for production deployment

TypeScript is pinned to `~6.0.x` on purpose. TypeScript 7 is the native rewrite and its JS API exposes only `version` — no `ts.sys`, no `parseJsonConfigFileContent` — which crashes SvelteKit's tsconfig handling. SvelteKit 3, svelte-check, and typescript-eslint all declare `typescript: ^6.0.0`. Don't let a dependency bump pull in 7.

## Architecture

### Build Configuration

There is **no `svelte.config.js`** — SvelteKit 3 removed it. Preprocessor, adapter, `alias`, and `tracing` all live in the `sveltekit({ ... })` call in `vite.config.ts`.

`$lib` and `$locales` work only because they are declared in that `alias` map. SvelteKit 3 dropped the built-in `$lib` in favour of `#lib` subpath imports, so the build prints a `config_option_deprecated_alias` warning on every run. Leave it — removing it means rewriting ~350 import sites.

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

Tests may be sectioned: the backend returns `question_sets` which is flattened into a single question list via `normalizeTestQuestions` in `$lib/helpers/questionSetHelpers.ts`.

### Session Management

Candidate identity is stored in a `sashakt-candidate` cookie (contains `candidate_uuid` and `candidate_test_id`). Parsed by `src/lib/helpers/getCandidate.ts`. API routes validate the cookie matches request parameters.

### Form System

`DynamicForm` → `FormField` → specific field component (11 types in `src/lib/components/form/fields/`). Validation logic is in `validation.ts`. Form responses are collected in the parent and submitted via SvelteKit form actions.

### Test Configuration

Vitest uses two test projects configured in `vite.config.ts`:

- **client**: `*.svelte.test.ts` files, jsdom environment, setup in `vitest-setup-client.ts`
- **server**: `*.test.ts` files (excluding `.svelte.`), node environment

When two timers land on the same fake timestamp (e.g. the 1s countdown and the 15s heartbeat in `TestTimer`), don't assert on a value that depends on which one runs first — Vitest has changed that ordering across versions. Assert the invariant the test is actually about instead.

### i18n

Locale files are in `src/locales/`. Use `$t('key')` for translations. For tests, use `initializeI18nForTests()` and `setLocaleForTests()` from `src/lib/test-utils.ts`. The `$locales` path alias points to `src/locales`.

## Key Types

Core types are in `src/lib/types.ts`:

- `TQuestion` - Question with options, type, marking scheme (supports partial marks), optional `media`
- `TSelection` - Candidate's answer state per question
- `TTestSession` - Candidate + selections + current page
- `question_type_enum` - SINGLE, MULTIPLE, SUBJECTIVE, NUMERICALINTEGER, NUMERICALDECIMAL, MATRIXRATING, MATRIXMATCH, MATRIXINPUT
- `TQuestionSetCandidate` - Section grouping with `question_revisions` and per-section marking
- `TMedia` / `TMediaImage` / `TExternalMedia` - Image and external media (YouTube, etc.) attachments
- `TFormField` / `TForm` - Dynamic form field definitions

## Environment Variables

Every env var must be declared in **`src/env.ts`** via `defineEnvVars`. SvelteKit 3 no longer infers them from the `PUBLIC_` prefix — an undeclared var simply isn't exported, and the build fails with `"FOO" is not exported by ... $env/static/private`. Adding a var means editing `src/env.ts` _and_ `.env`.

- `BACKEND_URL` (`static: true`, server-only) - FastAPI backend URL
- `PUBLIC_APP_ENV` (`public: true, static: true`) - Environment name (development/staging/production)

Both are `static`, so they are inlined at build time and must be set when `pnpm run build` runs, not just at boot.

SvelteKit 3 validates every declared variable at startup, so **Vitest refuses to start without them** even though tests mock `$env/static/private`. Committed placeholders live in **`.env.test`**, which Vite loads only for `mode=test` — that keeps `vitest` working in CI and on a fresh clone with no `.env`, while a production build still reads `.env` and still fails loudly on a missing `BACKEND_URL`. Declare a new var in all three places: `src/env.ts`, `.env.example`, and `.env.test`.

Existing code imports these from `$env/static/private` / `$env/static/public`. Those paths still work but are deprecated aliases for `$app/env/private` / `$app/env/public`, and warn in dev.

## Svelte 5 Gotchas

- Never use `$effect` with a condition that checks reactive state modified by an async function it calls — causes infinite loops. Use a boolean flag instead.
- `$state` array reassignment (even `arr = []`) creates a new reference and triggers reactive updates.
- bits-ui Combobox `inputValue` is not `$bindable()` — use one-way prop + `oninput` listener.

## Known Issues

Neither `pnpm run check` nor `pnpm run lint` is currently clean, and neither gates CI — `.github/workflows/test-run.yml` only runs `vitest run --coverage`, and deploys only run `pnpm run build`. Keep **tests and build** green; treat the two below as background noise unless you're deliberately cleaning them up.

- **`pnpm run check`**: ~205 errors, concentrated in `*.test.ts` files (loose mock object literals vs. generated `PageData`/`ActionData` types). Also long-standing errors in `vite.config.ts`, `select-label.svelte`, `CandidateProfile.svelte`. Note `$app/tsconfig` sets `"types": ["$app/types"]`, so root config files (`playwright.config.ts`, `eslint.config.js`) have no Node globals and report `Cannot find name 'process'`.
- **`pnpm run lint`**: ~217 `@typescript-eslint/no-explicit-any` errors, all in test files.

## Conventions

- Use top-level imports (not inline/dynamic imports unless necessary)
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.)
- Create plan/tracking files in the `plans/` folder (gitignored), never in the project root. Never delete plan files.
- Never hardcode colors (e.g., `text-gray-600`, `bg-blue-500`). Use theme tokens defined in `app.css` (e.g., `text-muted-foreground`, `bg-primary`, `border-border`).
