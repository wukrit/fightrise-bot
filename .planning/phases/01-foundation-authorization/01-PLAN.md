---
wave: 1
depends_on: []
files_modified:
  - apps/web/lib/tournament-admin.ts
  - apps/web/app/tournaments/[id]/admin/page.tsx
  - apps/web/app/api/tournaments/[id]/admin/register/route.ts
  - apps/web/app/api/tournaments/[id]/admin/registrations/route.ts
autonomous: true
---

# Phase 1: Foundation & Authorization

**Goal:** Users can securely access tournament admin pages with proper role-based authorization.

## Context

This plan implements the authorization layer for tournament admin pages. Discord OAuth (AUTH-01) is already implemented. The main work involves creating an authorization helper, securing existing API endpoints, and building the admin dashboard page.

## Success Criteria (must_haves)

- [ ] User can access tournament admin pages only if they have TournamentAdmin role in database (AUTH-02)
- [ ] API endpoints verify tournament admin role before returning data (AUTH-03)
- [ ] Unauthorized access returns 403 instead of exposing data (AUTH-04)
- [ ] Admin can view tournament dashboard at /tournaments/[id]/admin (DASH-01)
- [ ] Dashboard shows tournament state, entrant count, and match count (DASH-02)

## Tasks

### Task 1: Create requireTournamentAdmin() Authorization Helper

<files>
- apps/web/lib/tournament-admin.ts (NEW)
</files>

<action>
Create a reusable authorization helper function that:
1. Validates NextAuth session exists (returns 401 if not authenticated)
2. Finds user by discordId from session
3. Queries TournamentAdmin table for userId + tournamentId + role in [OWNER, ADMIN, MODERATOR]
4. Returns 403 if no admin role found
5. Returns { userId, role, isAdmin: true } on success

Use Prisma AdminRole enum from @fightrise/database. Follow the exact pattern from existing registrations route (lines 28-76).

Export both the helper function AND types for TypeScript.
</action>

<verify>
- File exists: `apps/web/lib/tournament-admin.ts`
- TypeScript compiles: `npx tsc --noEmit apps/web/lib/tournament-admin.ts`
- Exports: `requireTournamentAdmin` function and `TournamentAdminCheck` type
</verify>

<done>
- requireTournamentAdmin() returns proper NextResponse with 401/403 on auth failures
- Helper returns userId and role on successful authorization

---

### Task 2: Apply Authorization Helper to Existing Admin API Routes

<files>
- apps/web/app/api/tournaments/[id]/admin/register/route.ts (MODIFY)
- apps/web/app/api/tournaments/[id]/admin/registrations/route.ts (MODIFY)
</files>

<action>
For each admin API route:
1. Import `requireTournamentAdmin` from '@/lib/tournament-admin'
2. Replace inline auth checks with the helper function
3. Ensure 403 is returned for unauthorized access (AUTH-04)
4. Use `{ cache: 'no-store' }` for all Prisma queries to ensure fresh data

Follow the pattern: call helper at start of handler, return early if error response.
</action>

<verify>
- Existing tests pass: `npm run docker:test:integration -- --grep "admin"`
- Manual test: curl without auth returns 401, curl as non-admin returns 403
</verify>

<done>
- All admin API routes use requireTournamentAdmin() helper
- Non-admin users receive 403 Forbidden responses

---

### Task 3: Create Tournament Admin Dashboard Page

<files>
- apps/web/app/tournaments/[id]/admin/page.tsx (NEW)
- apps/web/components/admin/DashboardStats.tsx (NEW)
- apps/web/components/admin/RecentAuditLogs.tsx (NEW)
</files>

<action>
Create the admin dashboard at `/tournaments/[id]/admin`:

1. Server Component (page.tsx):
   - Import and call `requireTournamentAdmin` at top
   - If returns error NextResponse, handle appropriately (redirect or show error)
   - Fetch tournament with _count for registrations and events
   - Fetch recent audit logs (last 10) for DASH-02
   - Pass data to client component

2. Client Components:
   - DashboardStats: Use @fightrise/ui Card component to show:
     - Tournament state (from tournament.state)
     - Entrant count (from tournament._count.registrations)
     - Match count (from tournament._count.events or separate query)
   - RecentAuditLogs: Simple list showing action, user, timestamp

Use @fightrise/ui components: Card, Table, Badge as needed.
</action>

<verify>
- Page loads at /tournaments/[id]/admin for admin users
- Page returns 403 for non-admin users
- Dashboard shows tournament stats (state, entrants, matches)
- Dashboard shows recent audit logs
</verify>

<done>
- Admin dashboard accessible at /tournaments/[id]/admin for authorized users
- Dashboard displays tournament state, entrant count, match count
- Dashboard shows last 10 audit log entries
</done

---

## Wave Summary

| Wave | Tasks | Objective |
|------|-------|-----------|
| 1 | 1, 2, 3 | Complete authorization layer and dashboard |

## Requirements Coverage

| Req ID | Task | Status |
|--------|------|--------|
| AUTH-01 | - | Already implemented |
| AUTH-02 | 1, 2, 3 | Covered |
| AUTH-03 | 2 | Covered |
| AUTH-04 | 1, 2 | Covered |
| API-01 | 2 | Already exists, refactored |
| DASH-01 | 3 | Covered |
| DASH-02 | 3 | Covered |

## Notes

- Discord OAuth (AUTH-01) already implemented in apps/web/lib/auth.ts
- API-01 (registrations list) already exists, just needs helper refactor
- Phase focuses on: helper creation + API route refactor + dashboard page
