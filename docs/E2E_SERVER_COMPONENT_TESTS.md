# E2E Test Issues with Next.js Server Components

## Problem Statement

E2E tests for admin pages (registrations, matches, audit-log) fail because these pages use **Next.js Server Components**. The test mocks don't work for server-side data fetching and authentication.

## Root Cause

### How the Tests Currently Work

1. **Client-side mocks**: Tests use `page.route()` to mock API responses in the browser
2. **Session mocking**: Tests mock NextAuth session via `/api/auth/session` endpoint
3. **Works for**: Client Components that fetch data in `useEffect` or similar

### Why It Fails for Server Components

```typescript
// Server Component (app/tournaments/[id]/admin/registrations/page.tsx)
export default async function AdminRegistrationsPage({ params }) {
  // This runs ON THE SERVER, not in the browser
  const auth = await requireTournamentAdminById(tournamentId);
  // ...
}
```

```typescript
// requireTournamentAdminById uses getServerSession() - server-side only
const session = await getServerSession(authOptions);
```

**The issue**: `page.route()` only mocks requests made by the **browser**. Server Components run on the **server** before the page is sent to the browser, so they can't be intercepted by client-side mocks.

### Server vs Client Data Flow

```
Client-side Component:        Server-side Component:
┌─────────────────┐          ┌─────────────────┐
│   Browser       │          │   Next.js       │
│                 │          │   Server        │
│ useEffect()     │          │                 │
│   ↓             │          │ async function  │
│ fetch() ────────►         │   ↓             │
│ page.route()    │          │ getServerSession│
│ intercepts! ✓   │          │   ↓             │
└─────────────────┘          │ DB query        │
                            │ Cannot mock! ✗  │
                            └─────────────────┘
```

## Affected Tests

| Test File | Page Type | Status |
|-----------|-----------|--------|
| dashboard.spec.ts | Client Component | ✓ Working |
| tournament-list.spec.ts | Client Component | ✓ Working |
| matches.spec.ts | Client Component | ✓ Working |
| account.spec.ts | Mixed | ⚠️ Partial |
| registrations-admin.spec.ts | Server Component | ✗ Failing |
| matches-admin.spec.ts | Server Component | ✗ Failing |
| audit-log.spec.ts | Server Component | ✗ Failing |

## Possible Solutions

### Option 1: Skip Server Component Tests (Simplest)

Mark failing tests as skipped with a clear explanation:

```typescript
test.describe.skip('Admin Pages', () => {
  // These tests require a different approach
});
```

**Pros**: Quick fix, focuses effort on testable features
**Cons**: No coverage for admin pages

---

### Option 2: Integration Tests with Real Auth (Recommended for Admin)

Use actual NextAuth session handling:

1. Create a test user in the database
2. Use test Discord credentials
3. Sign in via OAuth flow in tests
4. Test against real authenticated sessions

```typescript
test('admin can view registrations', async ({ page }) => {
  // 1. Navigate to sign-in
  await page.goto('/api/auth/signin');

  // 2. Fill in test credentials
  await page.fill('[name="username"]', TEST_DISCORD_USER);
  await page.fill('[name="password"]', TEST_DISCORD_PASS);

  // 3. Sign in
  await page.click('[type="submit"]');

  // 4. Navigate to admin page (now authenticated for real)
  await page.goto(`/tournaments/${TOURNAMENT_ID}/admin/registrations`);
});
```

**Pros**: Realistic testing, tests actual auth flow
**Cons**: Requires test Discord account, slower, more setup

---

### Option 3: Test Mode Environment Variable

Add a special mode for testing that bypasses real auth:

```typescript
// lib/auth.ts
export async function getSessionForTesting(testUserId: string) {
  if (process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_AUTH) {
    return {
      user: {
        id: testUserId,
        discordId: '...',
        // ... mock session data
      }
    };
  }
  return getServerSession(authOptions);
}
```

Set in test environment:
```bash
# .env.test
ENABLE_TEST_AUTH=true
TEST_ADMIN_USER_ID=test-tournament-admin-cuid
```

**Pros**: Fast, no external dependencies
**Cons**: Requires code changes, test code in production path

---

### Option 4: Convert to Client Components

Make admin pages Client Components with SWR/TanStack Query:

```typescript
// Instead of Server Component:
export default async function AdminPage({ params }) {
  const data = await fetchData(); // Server-side
  return <AdminTable data={data} />;
}

// Use Client Component:
'use client';
export default function AdminPage({ params }) {
  const { data } = useSWR(`/api/tournaments/${params.id}/admin/data`);
  return <AdminTable data={data} />;
}
```

**Pros**: Can use existing mock infrastructure
**Cons**: Loses server-side benefits, more client JS

---

### Option 5: Middleware-Level Session Mocking

Mock session at the Next.js middleware level:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // In test mode, inject test session header
  if (process.env.NODE_ENV === 'test') {
    const testSession = {
      user: {
        id: request.headers.get('x-test-user-id'),
        discordId: '123456789',
      }
    };
    // Set session cookie or header for downstream
  }
}
```

**Pros**: Works for both server and client components
**Cons**: Complex, may have security implications

---

## Recommendation

For a project like this, I recommend a combination:

1. **Short-term**: Skip the failing admin page tests (Option 1)
2. **Medium-term**: Implement test mode environment variable (Option 3) for fast admin page testing
3. **Long-term**: Consider integration tests with real auth for critical admin workflows (Option 2)

## Files to Modify

If implementing Option 3 (Test Mode):

- `apps/web/lib/auth.ts` - Add test session support
- `apps/web/.env.test` - Add test env vars
- `apps/web/middleware.ts` - Optional: add test mode middleware

If implementing Option 2 (Integration Tests):

- Update Playwright config for test accounts
- Create test user fixtures in `apps/web/__tests__/e2e/utils/seed.ts`
- Rewrite admin tests to use real auth flow
