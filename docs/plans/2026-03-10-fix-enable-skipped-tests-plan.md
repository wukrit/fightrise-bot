---
title: Enable and Fix Skipped Tests
type: fix
status: active
date: 2026-03-10
---

# Enable and Fix Skipped Tests

## Overview

Restore full test coverage by enabling and fixing all currently skipped tests in the codebase. This involves three main areas: 6 E2E test files with 92 skipped tests, 1 auth test with session mocking issues, and investigating/repairing any broken unit tests.

## Problem Statement

The test suite has ~93 tests currently skipped, which reduces confidence in code changes and hides potential regressions. The original reason for skipping was "pages don't exist," but investigation shows the pages DO exist - the tests just need to be enabled and any failures fixed.

### Current Skipped Tests Summary

| Category | Count | Files |
|----------|-------|-------|
| E2E (account) | 21 tests | account.spec.ts |
| E2E (tournaments) | 5 tests | tournaments.spec.ts |
| E2E (tournament-list) | 14 tests | tournament-list.spec.ts |
| E2E (registrations-admin) | 18 tests | registrations-admin.spec.ts |
| E2E (matches-admin) | 17 tests | matches-admin.spec.ts |
| E2E (audit-log) | 17 tests | audit-log.spec.ts |
| E2E (auth) | 1 test | auth.spec.ts |
| Unit tests | ~2 tests | tournamentService.test.ts |
| **Total** | **~95 tests** | |

## Proposed Solution

### Approach 1: Enable Tests File by File (Recommended)

Process each skipped test file sequentially:
1. Remove `test.skip` from each test
2. Run the tests to identify failures
3. Fix failures (could be: page structure, API mocks, selectors)
4. Commit each file when passing

**Pros:**
- Manageable scope - can pause between files
- Clear progress tracking
- Each file becomes a PR

**Cons:**
- Takes multiple sessions to complete

### Approach 2: Batch Enable All

Remove all `test.skip` at once and fix failures in bulk.

**Pros:**
- Fast initial progress
- See full scope of work

**Cons:**
- Could result in many test failures to fix at once
- Harder to track progress

## Technical Approach

### Phase 1: Enable E2E Tests (Priority Order)

Run `npx playwright test <file> --reporter=line` for each file and fix failures:

1. **tournament-list.spec.ts** (14 tests) - Simplest, likely works
2. **account.spec.ts** (21 tests) - Account page exists
3. **tournaments.spec.ts** (5 tests) - Tournament pages exist
4. **registrations-admin.spec.ts** (18 tests) - Admin page exists
5. **matches-admin.spec.ts** (17 tests) - Admin matches exist
6. **audit-log.spec.ts** (17 tests) - Audit page exists

Common failure types to fix:
- **Page structure mismatches** - Tests expect certain selectors that don't exist
- **API mock format** - Mock responses may not match what the page expects
- **Navigation changes** - URL patterns may have changed

### Phase 2: Fix Auth Test

The test "should access protected route with mocked session" fails because:
- Session cookie is set but NextAuth middleware doesn't recognize it
- Even with `E2E_AUTH_BYPASS=true`, redirect still occurs

Investigation needed:
- Check cookie domain/path configuration
- Verify JWT token format matches what NextAuth expects
- Check if middleware auth bypass is working correctly

### Phase 3: Unit Tests

Check current state of skipped unit tests:
```bash
grep -r "it\.skip\|test\.skip" apps/bot/src/services/__tests__/
```

If tests exist, fix the mock setup issues.

## Implementation Phases

### Phase 1: Tournament List Tests (1-2 hours)
- Remove `test.skip` from tournament-list.spec.ts
- Run tests, identify failures
- Fix page object selectors or API mocks
- Verify all 14 tests pass

### Phase 2: Account Tests (2-3 hours)
- Remove `test.skip` from account.spec.ts
- Run tests, identify failures
- Fix account page tests
- Verify all 21 tests pass

### Phase 3: Tournament Flow Tests (1-2 hours)
- Remove `test.skip` from tournaments.spec.ts
- Run tests, identify failures
- Fix tests

### Phase 4: Admin Pages (3-4 hours)
- registrations-admin.spec.ts (18 tests)
- matches-admin.spec.ts (17 tests)
- audit-log.spec.ts (17 tests)

### Phase 5: Auth Test Fix (2-3 hours)
- Investigate session mocking issue
- Fix auth.spec.ts test

### Phase 6: Unit Tests (1 hour)
- Find and fix any skipped unit tests

## Acceptance Criteria

- [ ] All 92 E2E tests in 6 files enabled and passing
- [ ] Auth test fixed and passing
- [ ] Unit tests investigated and fixed if applicable
- [ ] CI pipeline shows all tests passing
- [ ] Test coverage restored to full suite

## Success Metrics

- Total tests passing: 22 → 115+ (before smoke tests)
- Test coverage improvement: ~50% increase in E2E coverage
- CI reliability: Full test suite provides better regression detection

## Dependencies & Risks

### Dependencies
- Playwright E2E infrastructure working
- Database seeded for E2E tests
- Auth bypass working for middleware

### Risks
- Some tests may require significant fixes if page structure changed
- Auth test fix may require deeper investigation of NextAuth internals
- Time estimate may vary based on actual failures found

## References

- Playwright config: `playwright.config.ts`
- Auth utils: `apps/web/__tests__/e2e/utils/auth.ts`
- Middleware: `apps/web/middleware.ts`
- Auth config: `apps/web/lib/auth.ts`
- Skipped tests doc: `docs/skipped-tests-summary.md`

## Related Work

- Previous commit: `6009d28` - "test: skip failing auth test"
- Previous commits: `b7b6f6c`, `4a9e661` - "test: temporarily skip failing E2E tests"
