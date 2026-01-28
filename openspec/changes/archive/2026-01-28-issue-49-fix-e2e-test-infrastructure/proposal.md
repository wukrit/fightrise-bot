# Change: Fix E2E test infrastructure in CI

GitHub Issue: #49

## Why

The E2E tests in CI are failing due to infrastructure configuration issues:

1. **Bot E2E tests**: Vitest config excludes `src/__tests__/e2e/**` which conflicts with the E2E test command filter, resulting in "No test files found"

2. **Web E2E tests**: Playwright times out waiting for the web server because the job lacks a postgres service needed for the Next.js app to start

These failures block the CI pipeline from having a fully green status.

## What Changes

- Create a dedicated vitest config for bot E2E tests that doesn't exclude the E2E directory
- Add postgres service to the E2E Tests (Web) job in CI workflow
- Add database schema push step before running Playwright tests
- Update bot package.json to use the E2E-specific vitest config

## Impact

- Affected specs: None (infrastructure only)
- Affected code:
  - `apps/bot/vitest.config.ts` (new E2E config)
  - `apps/bot/package.json` (update test:e2e script)
  - `.github/workflows/e2e.yml` (add postgres service to web job)
