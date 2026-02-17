---
title: Implement E2E test API mocking for Next.js App Router
type: fix
status: completed
date: 2026-02-16
---

# Implement MSW for E2E Test API Mocking

> **NOTE:** Instead of using MSW service workers, we used a simpler approach: `page.addInitScript` to intercept fetch requests at the browser level.

## What Was Implemented

The solution uses Playwright's `page.addInitScript` to inject a fetch interceptor before the page loads:

```typescript
// In test's beforeEach
await page.addInitScript((mockData) => {
  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const urlObj = new URL(url, 'http://localhost:4000');
    const pathname = urlObj.pathname;

    // Check if it's a match API request
    if (pathname.startsWith('/api/matches/')) {
      const matchId = pathname.split('/api/matches/')[1]?.split('?')[0];
      if (matchId && mockData[matchId]) {
        return new Response(JSON.stringify(mockData[matchId]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    // ... handle other endpoints
    return originalFetch(input, init);
  };
}, mockMatchData);
```

## Why This Works

1. **Injected before page loads**: The script runs before any page JavaScript executes
2. **Overrides window.fetch**: All fetch calls (including React's useEffect) go through our mock
3. **Works with client-side components**: Handles 'use client' components that fetch data in useEffect

## Results

- **6 Match Reporting tests now pass** (all tests in matches.spec.ts)
- The approach is simpler than MSW service workers
- Works reliably with Next.js App Router client components

---

## Problem Statement

The current Playwright E2E tests fail because `page.route()` doesn't reliably intercept Next.js App Router dynamic API routes. The routes like `/api/matches/[id]` use bracket notation in the filesystem, causing pattern matching issues with Playwright's URL interceptors.

## Root Cause Analysis

1. **SSR timing**: Playwright's route interception is set up in `beforeEach`, but initial page loads involve server-side rendering where requests happen before client-side interception is active.

2. **URL normalization**: Next.js App Router generates URLs differently during SSR vs client-side navigation, causing pattern mismatches.

3. **Dynamic route patterns**: Routes like `/api/matches/[id]/report` don't match reliably with Playwright's wildcard patterns.

## Solution: MSW (Mock Service Worker)

Use MSW with `playwright-msw` to intercept requests at the network level, before they reach the server. This works for both SSR and client-side requests.

**Note**: MSW is already installed at root level (`msw@^2.0.0`).

## Implementation Plan

### Phase 1: Setup MSW (IN PROGRESS)

- [x] Verify msw is installed (already at root: `msw@^2.0.0`)
- [ ] Install `playwright-msw` in root (dev dependency)
- [ ] Create MSW handlers file: `apps/web/__tests__/e2e/handlers/`
- [ ] Create test fixture that sets up MSW: `apps/web/__tests__/e2e/fixtures/msw.ts`

### Phase 2: Create API Handlers

- [ ] Create handlers for `/api/tournaments` endpoints
- [ ] Create handlers for `/api/tournaments/[id]` endpoints
- [ ] Create handlers for `/api/matches` endpoints
- [ ] Create handlers for `/api/matches/[id]` endpoints
- [ ] Create handlers for action endpoints (report, confirm, dispute)

### Phase 3: Update Mock Data

- [ ] Update tournament mock data to match actual API response format
- [ ] Update match mock data to match actual API response format
- [ ] Add missing fields that the pages expect

### Phase 4: Update Tests to Use MSW

- [ ] Update `tournaments.spec.ts` to use MSW handlers
- [ ] Update `matches.spec.ts` to use MSW handlers
- [ ] Update `dashboard.spec.ts` to use MSW handlers

### Phase 5: Verify Tests Pass

- [ ] Run E2E tests with single browser
- [ ] Fix any handler issues
- [ ] Run full test suite

## Technical Details

### MSW Handler Structure

```typescript
// apps/web/__tests__/e2e/handlers/index.ts
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

export const handlers = [
  // List tournaments
  http.get('/api/tournaments', () => {
    return HttpResponse.json({
      tournaments: [mockTournament],
      total: 1,
    });
  }),

  // Single tournament
  http.get('/api/tournaments/:id', ({ params }) => {
    if (params.id === mockTournament.id) {
      return HttpResponse.json(mockTournament);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Match details
  http.get('/api/matches/:id', ({ params }) => {
    const match = mockMatches[params.id];
    if (match) {
      return HttpResponse.json(match);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Actions
  http.post('/api/matches/:id/report', () => {
    return HttpResponse.json({ success: true });
  }),
];

export const worker = setupWorker(...handlers);
```

### Test Fixture

```typescript
// apps/web/__tests__/e2e/fixtures/msw.ts
import { test as base, expect } from '@playwright/test';
import { createWorkerFixture } from 'playwright-msw';
import { handlers } from '../handlers';

const test = base.extend({
  worker: createWorkerFixture(handlers),
});

export { test, expect };
```

### Updated Test Usage

```typescript
// In each test file
import { test, expect } from '../fixtures/msw';

test('should display match information', async ({ page, worker }) => {
  // MSW is now handling all API calls automatically
  await page.goto(`/matches/${mockMatch.id}`);

  await expect(page.locator('body')).toContainText(mockMatch.tournamentName);
});
```

## Mock Data Requirements

The handlers need to return data matching what the actual API returns:

### Tournament Response Format
```typescript
{
  id: string;
  name: string;
  startggSlug: string;
  startAt: string | null;
  endAt: string | null;
  state: 'CREATED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}
```

### Match Response Format
```typescript
{
  id: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  bestOf: number;
  state: string;
  player1: { id: string; name: string; discordId: string; reportedScore: number | null; isWinner: boolean | null; } | null;
  player2: { id: string; name: string; discordId: string; reportedScore: number | null; isWinner: boolean | null; } | null;
  isPlayer1: boolean;
  myReportedScore: number | null;
  myIsWinner: boolean | null;
}
```

## Dependencies

```bash
# Install in apps/web
npm install -D msw playwright-msw
```

## References

- MSW Docs: https://mswjs.io/docs/
- playwright-msw: https://www.npmjs.com/package/playwright-msw
- Existing MSW usage: `packages/startgg-client/src/__mocks__/`
