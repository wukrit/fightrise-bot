# Phase 1: Foundation & Authorization - Research

**Researched:** 2026-02-25
**Domain:** Next.js web app authorization, Discord OAuth, tournament admin role management
**Confidence:** HIGH

## Summary

Phase 1 focuses on securing tournament admin pages with proper role-based authorization. The good news: Discord OAuth authentication is already implemented via NextAuth in `apps/web/lib/auth.ts`, and the TournamentAdmin model with OWNER/ADMIN/MODERATOR roles already exists in the database schema. The main work involves creating an authorization helper function, securing API endpoints, building the admin dashboard page, and ensuring proper 403 error handling.

**Primary recommendation:** Create a reusable `requireTournamentAdmin()` helper that combines NextAuth session validation with TournamentAdmin role checks, then apply it consistently across all admin API routes and page components.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use existing TournamentAdmin database model (OWNER/ADMIN/MODERATOR roles)
- Create requireTournamentAdmin() helper combining NextAuth session + Prisma check
- API endpoints verify role before returning data (403 on unauthorized)
- REST API at /api/tournaments/[id]/admin/*
- Use existing Route Handler pattern from codebase

### Claude's Discretion
- Dashboard layout specifics - open to standard admin dashboard patterns
- UI component choices - use existing UI package with Radix primitives

### Deferred Ideas (OUT OF SCOPE)
- Discord role sync — Phase 1 focuses on web admin auth
- Real-time updates — defer to later phase

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign in via Discord OAuth | Already implemented in `apps/web/lib/auth.ts` with DiscordProvider |
| AUTH-02 | User can access tournament admin pages only if they have TournamentAdmin role in database | Need to create `requireTournamentAdmin()` helper |
| AUTH-03 | API endpoints verify tournament admin role before returning data | Apply helper to API routes; pattern exists in registrations route |
| AUTH-04 | Unauthorized access returns 403 instead of exposing data | Implement in helper; existing routes use 403 |
| API-01 | GET /api/tournaments/[id]/admin/registrations - List registrations with filters | Already exists in `apps/web/app/api/tournaments/[id]/admin/registrations/route.ts` |
| DASH-01 | Admin can view tournament dashboard at /tournaments/[id]/admin | Need to create new page |
| DASH-02 | Dashboard shows tournament state, entrant count, match count | Query Tournament, Registration, Match counts |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NextAuth.js | ^4.x | Discord OAuth authentication | Industry standard for Next.js auth |
| Prisma | ^5.x | Database ORM with type safety | Already in use |
| Next.js | 14.x | App Router | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fightrise/ui | * | Radix UI components | All admin UI elements |
| zod | ^3.x | Request validation | API route input validation |

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/
│   ├── tournaments/[id]/
│   │   └── admin/
│   │       └── page.tsx      # NEW: Admin dashboard page
│   └── api/
│       └── tournaments/[id]/
│           └── admin/
│               ├── registrations/route.ts  # Existing - needs helper
│               └── ...                     # NEW: Other admin endpoints
├── lib/
│   └── auth.ts               # Existing - NextAuth config
└── components/
    └── admin/                # NEW: Admin-specific components
```

### Pattern 1: requireTournamentAdmin() Helper
**What:** Reusable function that validates user session and tournament admin role
**When to use:** Every admin API route and page component

```typescript
// apps/web/lib/tournament-admin.ts
import { getServerSession } from 'next-auth';
import { prisma, AdminRole } from '@fightrise/database';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

interface AdminCheckResult {
  userId: string;
  role: AdminRole;
  isAdmin: true;
}

export async function requireTournamentAdmin(tournamentId: string): Promise<AdminCheckResult | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const admin = await prisma.tournamentAdmin.findFirst({
    where: {
      userId: user.id,
      tournamentId,
      role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
    },
  });

  if (!admin) {
    return NextResponse.json(
      { error: 'Only tournament admins can access this resource' },
      { status: 403 }
    );
  }

  return { userId: user.id, role: admin.role, isAdmin: true };
}
```

### Pattern 2: Admin Page with Server Component + Client Wrapper
**What:** Tournament admin pages use server components for data fetching with client component for interactivity
**When to use:** All /tournaments/[id]/admin/* pages

```typescript
// apps/web/app/tournaments/[id]/admin/page.tsx (Server Component)
import { requireTournamentAdmin } from '@/lib/tournament-admin';
import { prisma } from '@fightrise/database';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default async function AdminPage({ params }: { params: { id: string } }) {
  const authResult = await requireTournamentAdmin(params.id);

  // If returns NextResponse, it's an error
  if ('json' in authResult) {
    // Handle error - redirect or show error
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { registrations: true, events: true } },
    },
  });

  // Get recent audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { tournamentId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return <AdminDashboard tournament={tournament} auditLogs={auditLogs} />;
}
```

### Anti-Patterns to Avoid
- **Hardcoding admin checks inline**: Every route repeats the same 20 lines of auth code — extract to helper
- **Caching admin data**: Admin views should always be fresh — use `cache: 'no-store'` in fetch
- **Exposing 500 errors**: Always return proper error responses with appropriate status codes

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom OAuth flow | NextAuth.js DiscordProvider | Already implemented, handles token refresh |
| Session management | Custom JWT handling | NextAuth JWT strategy | Secure, battle-tested |
| Role checking | Manual Prisma queries | requireTournamentAdmin() helper | Consistency, DRY |
| Database access | Direct SQL | Prisma ORM | Type safety, already in use |

---

## Common Pitfalls

### Pitfall 1: Forgetting to Check All Admin Roles
**What goes wrong:** Only checking for OWNER role, missing ADMIN/MODERATOR
**Why it happens:** Copy-paste from examples that only check one role
**How to avoid:** Always use `role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] }`
**Warning signs:** Moderators can't access admin features

### Pitfall 2: Returning 401 Instead of 403
**What goes wrong:** Authenticated users who aren't admins get "Unauthorized" (401) instead of "Forbidden" (403)
**Why it happens:** Copy-pasting auth check code without adjusting for authorization
**How to avoid:** Return 403 when user is logged in but lacks permissions
**Warning signs:** Users see "Unauthorized" when they should see "Forbidden"

### Pitfall 3: Not Using no-store for Admin Data
**What goes wrong:** Stale data in admin dashboard
**Why it happens:** Default Next.js caching behavior
**How to avoid:** Use `{ cache: 'no-store' }` in Prisma queries or fetch calls
**Warning signs:** Dashboard doesn't reflect recent changes

---

## Code Examples

### Existing Pattern in registrations route.ts (lines 28-76)
```typescript
// This is the pattern to extract into helper
const session = await getServerSession(authOptions);

if (!session?.user?.discordId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const user = await prisma.user.findUnique({
  where: { discordId: session.user.discordId },
});

const adminCheck = await prisma.tournamentAdmin.findFirst({
  where: {
    userId: user.id,
    tournamentId,
    role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
  },
});

if (!adminCheck) {
  return NextResponse.json(
    { error: 'Only tournament admins can view registrations' },
    { status: 403 }
  );
}
```

### UI Package Components Available
- `Table` - for registration/match lists
- `Button` - for actions
- `Modal` - for confirmations
- `Card` - for dashboard stats
- `Badge` - for status indicators

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database sessions | JWT sessions | Early implementation | More scalable, stateless |
| Custom OAuth | NextAuth DiscordProvider | Already in place | Simplified auth flow |
| Inline auth checks | requireTournamentAdmin() helper | This phase | DRY, consistent |

---

## Open Questions

1. **Should the admin helper support client-side usage?**
   - What's unclear: Pages need server-side checks, but some interactions (button clicks) might need client-side role checks
   - Recommendation: Keep server-side for now, add client hooks if needed in Phase 2

2. **How to handle tournament not found vs unauthorized?**
   - What's unclear: Should users know a tournament exists if they're not admin?
   - Recommendation: Return 404 (not 403) for non-existent tournaments to avoid enumeration

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + Playwright |
| Config file | jest.config.ts, playwright.config.ts |
| Quick run command | `npm run docker:test` |
| Full suite command | `npm run docker:test && npm run docker:test:integration && npm run docker:test:e2e` |
| Estimated runtime | ~3 minutes |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Discord OAuth sign-in | E2E | `npm run docker:test:e2e -- --grep "auth"` | ✅ Yes |
| AUTH-02 | Admin page access control | Integration | `npm run docker:test:integration -- --grep "admin"` | ❌ Wave 0 gap |
| AUTH-03 | API admin role verification | Integration | `npm run docker:test:integration -- --grep "admin-api"` | ❌ Wave 0 gap |
| AUTH-04 | 403 on unauthorized access | Integration | `npm run docker:test:integration -- --grep "forbidden"` | ❌ Wave 0 gap |
| API-01 | Registration list endpoint | Integration | `npm run docker:test:integration -- --grep "registrations"` | ✅ Yes |
| DASH-01 | Admin dashboard page loads | E2E | `npm run docker:test:e2e -- --grep "admin-dashboard"` | ❌ Wave 0 gap |
| DASH-02 | Dashboard shows stats | E2E | `npm run docker:test:e2e -- --grep "dashboard-stats"` | ❌ Wave 0 gap |

### Nyquist Sampling Rate
- **Minimum sample interval:** After every committed task → run: `npm run docker:test`
- **Full suite trigger:** Before merging final task of any plan wave
- **Phase-complete gate:** Full suite green before `/gsd:verify-work` runs
- **Estimated feedback latency per task:** ~30 seconds

### Wave 0 Gaps (must be created before implementation)
- [ ] `apps/web/__tests__/integration/admin-auth.test.ts` — covers AUTH-02, AUTH-03, AUTH-04
- [ ] `apps/web/__tests__/e2e/admin-dashboard.test.ts` — covers DASH-01, DASH-02

---

## Sources

### Primary (HIGH confidence)
- `/home/ubuntu/fightrise-bot/apps/web/lib/auth.ts` - NextAuth configuration with Discord OAuth
- `/home/ubuntu/fightrise-bot/packages/database/prisma/schema.prisma` - TournamentAdmin model
- `/home/ubuntu/fightrise-bot/apps/web/app/api/tournaments/[id]/admin/registrations/route.ts` - Existing admin API pattern
- `/home/ubuntu/fightrise-bot/packages/ui/src/index.ts` - Available UI components

### Secondary (MEDIUM confidence)
- NextAuth.js documentation for session management patterns
- Radix UI documentation for accessible component primitives

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All technologies already in use
- Architecture: HIGH - Clear patterns from existing code
- Pitfalls: HIGH - Known patterns from codebase

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days for stable stack)
