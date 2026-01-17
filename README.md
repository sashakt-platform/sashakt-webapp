# Sashakt web app

[![codecov](https://codecov.io/gh/sashakt-platform/sashakt-webapp/graph/badge.svg?token=VI097YR23K)](https://codecov.io/gh/sashakt-platform/sashakt-webapp) [![Test status](https://github.com/sashakt-platform/sashakt-webapp/actions/workflows/test-run.yml/badge.svg)](https://github.com/sashakt-platform/sashakt-webapp/actions/workflows/test-run.yml)

This builds the test taker's frontend interface for the Sashakt platform.

## Developing

Clone this repo and install dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of your app:

```bash
pnpm run build
```

You can preview the production build with `npm run preview`.

## Extract localization strings

```bash
pnpm run extract-i18n
```

This will autopopulate the localization files in `src/locales/`.

## Deployment

This happens via CI/CD
