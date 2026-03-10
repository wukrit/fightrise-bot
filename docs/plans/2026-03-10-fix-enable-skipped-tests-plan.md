---
title: Enable and Fix Skipped Tests
type: fix
status: active
date: 2026-03-10
---

# Enable and Fix Skipped Tests

## Enhancement Summary

**Deepened on:** 2026-03-10
**Research sources:** 1 documented solution applied

### Key Improvements
1. **E2E API Mocking Fix**: Use `page.addInitScript()` instead of `page.route()` for Next.js App Router - critical insight from documented solution
2. **Phased approach refined**: Start with simplest file (tournament-list) to validate the mocking approach
3. **Auth test root cause identified**: Session cookie/JWT format mismatch with NextAuth middleware

### New Considerations Discovered
- The skipped tests likely fail because of SSR timing issues with `page.route()` - exactly what the existing solution addresses
- The auth test failure may require using the same `addInitScript` approach for cookie setting

---

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

### Approach: Enable Tests File by File (Recommended)

Process each skipped test file sequentially:
1. Remove `test.skip` from each test
2. Run the tests to identify failures
3. Fix failures using the `addInitScript` approach for API mocking
4. Commit each file when passing

**Why this approach:**
- Manageable scope - can pause between files
- Clear progress tracking
- Each file becomes a PR
- Validates mocking fix before tackling harder tests

## Research Insights

### Critical: E2E API Mocking Fix

**Source:** `docs/solutions/test-failures/e2e-playwright-nextjs-api-mocking.md`

The existing tests likely fail because they use `page.route()` which doesn't reliably intercept API calls in Next.js App Router due to SSR timing issues.

**The Solution:** Use `page.addInitScript()` to inject a fetch interceptor before the page loads:

```typescript
// In test's beforeEach hook
test.beforeEach(async ({ page }) => {
  // 1. Set up mock data BEFORE adding fetch mock
  await page.addInitScript((data) => {
    (window as any).__MOCK_MATCH_DATA__ = data;
  }, mockMatchData);

  // 2. Inject fetch mock before page loads
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url;
      const urlObj = new URL(url, 'http://localhost:4000');
      const pathname = urlObj.pathname;

      // Match API endpoint
      if (pathname.startsWith('/api/matches/')) {
        const matchId = pathname.split('/api/matches/')[1]?.split('?')[0];
        if (matchId && (window as any).__MOCK_MATCH_DATA__?.[matchId]) {
          const mockData = (window as any).__MOCK_MATCH_DATA__[matchId];
          return new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      return originalFetch(input, init);
    };
  });

  // 3. Mock authentication
  await mockAuthEndpoints(page);
});
```

**Why this works:**
- `addInitScript` runs at `document_start` before React hydrates
- Overrides `window.fetch` directly - app's code uses the overridden version
- SSR completes normally, client-side hydration uses intercepted fetch
- No race conditions unlike service workers

### Comparison: Mocking Methods

| Aspect | page.addInitScript | page.route() | MSW Service Worker |
|--------|-------------------|--------------|-------------------|
| Timing | Before page loads | After page starts | Async activation |
| Intercept scope | All fetch calls | Network-level | Network-level |
| Next.js App Router | Works reliably | May miss dynamic routes | Works but complex |
| Setup complexity | Simple | Simple | Requires handler setup |

**Recommendation:** Use `page.addInitScript()` for all API mocks in E2E tests with Next.js

### Auth Test Fix

The auth test fails because:
- Session cookie set for wrong URL (localhost:3000 vs 4000)
- JWT token format may not match what NextAuth expects

**Fix approach:**
1. Verify cookie domain matches Playwright baseURL
2. Use same `addInitScript` approach to set session data
3. Or simplify: rely on `E2E_AUTH_BYPASS=true` middleware flag

## Implementation Phases

### Phase 1: Tournament List Tests (1-2 hours)
- Remove `test.skip` from tournament-list.spec.ts
- **Add `addInitScript` API mocking** to tests
- Run tests, identify remaining failures
- Fix page object selectors or remaining API mocks
- Verify all 14 tests pass
- **Commit with message:** "test: enable tournament-list E2E tests with addInitScript mocking"

### Phase 2: Account Tests (2-3 hours)
- Remove `test.skip` from account.spec.ts
- Add `addInitScript` API mocking pattern
- Run tests, identify failures
- Fix account page tests
- Verify all 21 tests pass
- **Commit:** "test: enable account E2E tests"

### Phase 3: Tournament Flow Tests (1-2 hours)
- Remove `test.skip` from tournaments.spec.ts
- Add `addInitScript` pattern
- Run tests, identify failures
- Fix tests

### Phase 4: Admin Pages (3-4 hours)
- registrations-admin.spec.ts (18 tests)
- matches-admin.spec.ts (17 tests)
- audit-log.spec.ts (17 tests)
- Apply same `addInitScript` pattern to each

### Phase 5: Auth Test Fix (2-3 hours)
- Investigate session mocking issue
- Options:
  - Fix cookie URL to match baseURL
  - Use `addInitScript` to inject session
  - Simplify to rely on `E2E_AUTH_BYPASS` middleware flag
- Fix auth.spec.ts test

### Phase 6: Unit Tests (1 hour)
- Find any skipped unit tests
- Fix mock setup issues

## Technical Approach

### Phase 1: Enable E2E Tests (Priority Order)

Run `npx playwright test <file> --reporter=line` for each file:

1. **tournament-list.spec.ts** (14 tests) - Validate mocking approach
2. **account.spec.ts** (21 tests) - Account page exists
3. **tournaments.spec.ts** (5 tests) - Tournament pages exist
4. **registrations-admin.spec.ts** (18 tests) - Admin page exists
5. **matches-admin.spec.ts** (17 tests) - Admin matches exist
6. **audit-log.spec.ts** (17 tests) - Audit page exists

**Common failure types and fixes:**
- **Page structure mismatches** → Update page object selectors
- **API mock format** → Use `addInitScript` instead of `page.route()`
- **Navigation changes** → Update URL patterns

### Phase 2: Fix Auth Test

The test "should access protected route with mocked session" fails because:
- Session cookie set but NextAuth middleware doesn't recognize it
- Even with `E2E_AUTH_BYPASS=true`, redirect still occurs

**Investigation steps:**
1. Check cookie domain/path configuration against baseURL
2. Verify JWT token format matches what NextAuth expects
3. Test if middleware auth bypass is working (add debug logging)

### Phase 3: Unit Tests

```bash
grep -r "it\.skip\|test\.skip" apps/bot/src/services/__tests__/
```

If tests exist, fix the mock setup issues.

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

**Mitigation:** Start with simplest file (tournament-list) to validate approach before tackling harder ones

## References

- **Critical:** E2E API Mocking Solution: `docs/solutions/test-failures/e2e-playwright-nextjs-api-mocking.md`
- Playwright config: `playwright.config.ts`
- Auth utils: `apps/web/__tests__/e2e/utils/auth.ts`
- Middleware: `apps/web/middleware.ts`
- Auth config: `apps/web/lib/auth.ts`
- Skipped tests doc: `docs/skipped-tests-summary.md`

## Related Work

- Previous commit: `6009d28` - "test: skip failing auth test"
- Previous commits: `b7b6f6c`, `4a9e661` - "test: temporarily skip failing E2E tests"
- Related solution: `docs/solutions/test-failures/e2e-playwright-nextjs-api-mocking.md`
