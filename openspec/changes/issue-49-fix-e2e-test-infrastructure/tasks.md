# Tasks for issue-49-fix-e2e-test-infrastructure

## 1. Fix Bot E2E Test Configuration

- [x] 1.1 Create `apps/bot/vitest.e2e.config.ts` with E2E-specific settings (no exclude for e2e directory)
- [x] 1.2 Update `apps/bot/package.json` test:e2e script to use the new config file
- [x] 1.3 Create placeholder E2E test file (directory was empty)

## 2. Fix Web E2E Test Infrastructure

- [x] 2.1 Add postgres service to E2E Tests (Web) job in `.github/workflows/e2e.yml`
- [x] 2.2 Add `db:push` step before running Playwright tests
- [x] 2.3 Ensure DATABASE_URL is set correctly for all steps

## 3. Verification

- [x] 3.1 Verify bot E2E tests run locally with new config
- [ ] 3.2 Push changes and verify CI E2E jobs pass
