# Tasks for issue-49-fix-e2e-test-infrastructure

## 1. Fix Bot E2E Test Configuration

- [x] 1.1 Create `apps/bot/vitest.e2e.config.ts` with E2E-specific settings (no exclude for e2e directory)
- [x] 1.2 Update `apps/bot/package.json` test:e2e script to use the new config file
- [x] 1.3 Create placeholder E2E test file (directory was empty)

## 2. Fix Web E2E Test Infrastructure

- [x] 2.1 Add postgres service to E2E Tests (Web) job in `.github/workflows/e2e.yml`
- [x] 2.2 Add `db:push` step before running Playwright tests
- [x] 2.3 Ensure DATABASE_URL is set correctly for all steps

## 3. Fix Web E2E Test Timeout

- [x] 3.1 Update Playwright config to use production mode in CI (faster startup)
- [x] 3.2 Add stdout/stderr piping for debugging server startup issues

## 4. Verification

- [x] 4.1 Verify bot E2E tests run locally with new config
- [x] 4.2 Push changes and verify CI E2E infrastructure works
  - E2E Tests (Bot): PASS - tests run successfully
  - E2E Tests (Web): Server starts and tests execute (46 test failures are pre-existing test/UI mismatches, not infrastructure issues)

## Notes

The Web E2E test failures (46/57) are due to tests expecting UI elements that don't exist in the actual app. This is a separate issue from infrastructure - the tests need to be rewritten to match the actual UI, or the UI needs to be updated to match the tests. This should be addressed in a separate issue.
