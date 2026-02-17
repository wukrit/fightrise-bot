---
title: Enable skipped E2E tests with proper API mocking
type: feat
status: completed
date: 2026-02-17
---

# Enable Skipped E2E Tests with Proper API Mocking

## Overview

Enable the 13 skipped E2E tests in `dashboard.spec.ts` (3 tests) and `tournaments.spec.ts` (10 tests).

## Key Finding (from code review)

The mocking infrastructure already exists inline in the test files! The real issue is just removing `test.describe.skip`. The previous plan over-engineered this by proposing to create new utility files.

## Simplified Implementation

### Step 1: Analyze Existing Mocks

Check what mocking already exists in each test file:

**tournaments.spec.ts (lines 70-134):**
- Already has `mockTournamentApi()` function using `page.route()`
- Already has mock data for tournaments, matches, registration
- Already calls `mockAuthEndpoints(page)` in beforeEach

**dashboard.spec.ts:**
- Already calls `mockAuthEndpoints(page)` in beforeEach
- May need `/api/tournaments` mock added

### Step 2: Try Removing Skips

Simply remove the skip and run tests:

1. Remove `test.describe.skip` from `dashboard.spec.ts`
2. Remove `test.describe.skip` from `tournaments.spec.ts`
3. Update misleading skip comments
4. Run tests to see what actually fails

### Step 3: Fix Only What Breaks

If tests fail due to API mocking:
- Migrate from `page.route()` to `page.addInitScript()` pattern (matches.spec.ts style)
- Add missing mock endpoints

## Implementation Plan

### Phase 1: Remove Skips and Test

- [ ] Remove `test.describe.skip` from `dashboard.spec.ts`
- [ ] Remove `test.describe.skip` from `tournaments.spec.ts`
- [ ] Update/remove misleading skip comments
- [ ] Run E2E tests to see what actually fails

### Phase 2: Fix Failures (if any)

- [ ] Analyze any test failures
- [ ] Add `page.addInitScript()` mocking if needed (following matches.spec.ts pattern)
- [ ] Run tests again until passing

### Phase 3: Verify

- [ ] Confirm all 22 tests pass (9 existing + 13 enabled)
- [ ] No misleading comments remain

## Why This Is Simpler

| Previous Plan | Simplified |
|--------------|-----------|
| Create new `utils/api.ts` utility | Not needed - inline mocks exist |
| 4 implementation phases | 2 phases (try, fix if needed) |
| "Network error simulation" for future | YAGNI - remove |

## References

- Working pattern: `apps/web/__tests__/e2e/matches.spec.ts`
- Existing mocks: `apps/web/__tests__/e2e/tournaments.spec.ts:70-134`
