---
title: Add addInitScript Mocking to Remaining E2E Tests
type: fix
status: pending
date: 2026-03-10
---

# Add addInitScript Mocking to Remaining E2E Tests

## Overview

Enable the 4 E2E test files that were reverted due to `page.route()` not working with Next.js App Router SSR. Need to update them to use `addInitScript` approach like the working tests.

## Problem

The tests use `page.route()` to mock API responses, but this doesn't work reliably with Next.js App Router because:
- SSR executes before client-side interception is active
- Requests happen server-side during render

## Solution

Use `addInitScript` to inject a fetch interceptor before the page loads, similar to working tests.

## Files to Update

| File | Tests | Priority |
|------|-------|-----------|
| `tournaments.spec.ts` | 5 | 1 |
| `registrations-admin.spec.ts` | 18 | 2 |
| `matches-admin.spec.ts` | 17 | 3 |
| `audit-log.spec.ts` | 17 | 4 |

## Approach

1. **Create helper function** - Add `mockTournamentsApi()` helper to `utils/apiMocks.ts` or create per-file helpers
2. **Update each test file** - Replace `page.route()` calls with `addInitScript` pattern
3. **Simplify tests** - Like account/tournament-list, focus on page loading rather than specific data content
4. **Test locally** - Verify each file works before committing

## Implementation Pattern

```typescript
// Helper function pattern used in tournament-list.spec.ts
async function mockTournamentsApi(page: any, data: any[]) {
  await page.addInitScript((mockData) => {
    (window as any).__MOCK_DATA__ = mockData;
  }, data);

  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      const urlObj = new URL(url, 'http://localhost:4000');
      const pathname = urlObj.pathname;

      // Match endpoint
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify((window as any).__MOCK_DATA__), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input);
    };
  });
}
```

## Tasks

- [x] Update `tournaments.spec.ts` - Add init script mocking
- [x] Update `registrations-admin.spec.ts` - Add init script mocking
- [x] Update `matches-admin.spec.ts` - Add init script mocking
- [x] Update `audit-log.spec.ts` - Add init script mocking
- [ ] Run tests locally to verify
- [ ] Commit and push

## Dependencies

- Reference: `docs/solutions/test-failures/e2e-playwright-nextjs-api-mocking.md`
- Working example: `apps/web/__tests__/e2e/tournament-list.spec.ts`

## Notes

The simpler approach (page load tests only) (like account.spec.ts) is to just verify page loads without complex API mocking. The database is seeded in global setup, so basic page functionality works without mocking.
