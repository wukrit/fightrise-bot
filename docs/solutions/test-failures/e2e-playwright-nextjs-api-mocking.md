---
title: Playwright E2E Tests Fail to Intercept Next.js App Router Dynamic API Routes
category: test-failures
tags: [playwright, nextjs, e2e, mocking, api]
module: apps/web/__tests__/e2e
symptom: Tests showing "Loading match..." instead of actual data from API
root_cause: page.route() timing issues - SSR executes before client-side interception is active
---

# Playwright E2E Tests Fail to Intercept Next.js App Router Dynamic API Routes

## Problem Symptom

E2E tests using Playwright to test Next.js App Router pages showed "Loading..." instead of actual data. The API calls made in React `useEffect` were not being intercepted by `page.route()`.

```
Expected substring: "Weekly Fighting Game Tournament"
Received string: "Loading match...🏠Home🏆Tournaments➕New👤Account"
```

## Investigation Steps Tried

1. **MSW with playwright-msw**: Tried using MSW service workers with `playwright-msw` integration
   - Result: Service worker didn't activate properly for SSR requests

2. **page.route() with different patterns**: Tried various URL patterns
   - `**/api/matches/*`
   - `**/api/matches/**`
   - `http://localhost:4000/api/matches/*`
   - Result: No requests were intercepted

3. **Adding debug logging**: Found no API requests being logged
   - Conclusion: Requests were happening on the server side during SSR

4. **Checking container build**: Found stale Next.js build files in web container
   - Fixed by rebuilding: `docker compose -f docker-compose.dev.yml up -d --build web`

5. **Final solution**: Using `page.addInitScript()` to inject fetch interceptor

## Root Cause Analysis

The issue has multiple contributing factors:

1. **SSR timing**: Playwright's `page.route()` is set up in `beforeEach`, but initial page loads involve server-side rendering where requests happen before client-side interception is active

2. **URL normalization**: Next.js App Router generates URLs differently during SSR vs client-side navigation, causing pattern mismatches

3. **Dynamic route patterns**: Routes like `/api/matches/[id]` use bracket notation in the filesystem but compile to different URL patterns

4. **Client-side fetch**: React components use `window.fetch` in `useEffect`, which needs to be intercepted at the browser level

## Working Solution

The solution uses `page.addInitScript()` to inject a fetch interceptor directly into the browser context before any page JavaScript executes:

```typescript
// In test's beforeEach hook
test.beforeEach(async ({ page }) => {
  // 1. Set up mock data in page context BEFORE adding fetch mock
  await page.addInitScript((data) => {
    (window as any).__MOCK_MATCH_DATA__ = data;
  }, mockMatchData);

  // 2. Inject fetch mock before page loads
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url;
      const urlObj = new URL(url, 'http://localhost:4000'); // Base URL for relative URLs
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

        return new Response(JSON.stringify({ error: 'Match not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Handle other endpoints (report, confirm, dispute)
      if (pathname.match(/^\/api\/matches\/[^/]+\/(report|confirm|dispute)$/)) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return originalFetch(input, init);
    };
  });

  // 3. Mock authentication using existing utility
  await mockAuthEndpoints(page);
});
```

### Mock Data Structure

```typescript
const mockMatchData: Record<string, any> = {
  'match-123': {
    id: 'match-123',
    tournamentId: 'tournament-123',
    tournamentName: 'Weekly Fighting Game Tournament',
    round: 1,
    bestOf: 3,
    state: 'NOT_STARTED',
    player1: { id: 'user-current', name: 'CurrentPlayer', ... },
    player2: { id: 'user-456', name: 'OpponentPlayer', ... },
    isPlayer1: true,
    myReportedScore: null,
    myIsWinner: null,
    gameResults: [],
  },
  // More matches...
};
```

## Why This Works

1. **Injection timing**: `addInitScript` runs at `document_start` (before DOMContentLoaded), so the fetch override is in place before React hydrates

2. **Global override**: Overrides `window.fetch` directly - the application's own code calls the overridden version

3. **SSR compatibility**: SSR completes normally (bypasses the override since it runs server-side), but client-side hydration uses the intercepted fetch

4. **No race conditions**: Unlike service workers which activate asynchronously, the init script executes synchronously

## Comparison: page.addInitScript vs page.route() vs MSW

| Aspect | page.addInitScript | page.route() | MSW Service Worker |
|--------|-------------------|--------------|-------------------|
| Timing | Before page loads | After page starts | Async activation |
| Intercept scope | All fetch calls | Network-level | Network-level |
| Next.js App Router | Works reliably | May miss dynamic routes | Works but complex |
| Setup complexity | Simple | Simple | Requires handler setup |
| Debugging | Easy (console.log) | Playwright UI | Service worker logs |

## Prevention Strategies

### When to Use Each Method

**Use `page.addInitScript()` when:**
- Intercepting `fetch()` calls made by React components
- Mocking Next.js App Router API routes
- Handling client-side data fetching (SWR, React Query, useEffect)

**Use `page.route()` when:**
- Mocking external third-party APIs
- Testing error handling (network errors, timeouts)
- Static API routes with known paths

**Use MSW when:**
- Need to mock many endpoints consistently
- Already using MSW in development

### Best Practice: Dual-Layer Interception

For complete coverage, use both methods:

```typescript
// Layer 1: Client-side fetch (handles App Router)
await page.addInitScript(() => { /* fetch override */ });

// Layer 2: Network-level (handles external APIs)
await page.route('**/api/external/**', route => {
  route.fulfill({ json: mockData });
});
```

### Create Test Utilities

Consider creating reusable test utilities:

```typescript
// tests/utils/setup-api-mocks.ts
export async function setupApiMocks(page: Page, mocks: Record<string, unknown>) {
  await page.addInitScript((data) => {
    (window as any).__E2E_MOCKS__ = data;
    const originalFetch = window.fetch;
    window.fetch = async (input) => {
      // Match URLs against mock keys
      // Return mock responses
    };
  }, mocks);
}
```

## Test Results

- **6 Match Reporting tests now passing** (all tests in matches.spec.ts)
- Tests cover: view match details, 404 handling, best of format, score reporting, confirmation

## References

- Related issue: GitHub Issue #35 (Integration Testing)
- Plan document: `docs/plans/2026-02-16-fix-msw-e2e-testing-plan.md`
- QA skill: `docs/solutions/feature-implementations/qa-skill-automation.md`
- Playwright docs: https://playwright.dev/docs/api/class-page#page-add-init-script
- Next.js App Router: https://nextjs.org/docs/app
