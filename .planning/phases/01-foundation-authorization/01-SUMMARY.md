---
phase: "01"
plan: "01"
subsystem: "web-portal"
tags: ["authorization", "admin", "api-routes", "dashboard"]
dependency_graph:
  requires:
    - "AUTH-01 (Discord OAuth)"
  provides:
    - "AUTH-02 (Tournament admin role check)"
    - "AUTH-03 (API authorization)"
    - "AUTH-04 (403 for unauthorized)"
    - "DASH-01 (Admin dashboard page)"
    - "DASH-02 (Dashboard stats)"
  affects:
    - "Registration API"
    - "Match API"
tech_stack:
  added:
    - "requireTournamentAdmin helper"
    - "requireTournamentAdminById helper"
  patterns:
    - "Centralized authorization middleware"
    - "Server Components with auth"
    - "Rate-limited API routes"
key_files:
  created:
    - "apps/web/lib/tournament-admin.ts"
    - "apps/web/app/tournaments/[id]/admin/page.tsx"
  modified:
    - "apps/web/app/api/tournaments/[id]/admin/register/route.ts"
    - "apps/web/app/api/tournaments/[id]/admin/registrations/route.ts"
decisions:
  - "Used requireTournamentAdmin helper for consistent authorization"
  - "Helper returns NextResponse on error for easy route handler integration"
  - "Used requireTournamentAdminById for page authorization (no request object)"
  - "Admin dashboard includes quick links to registrations and matches"
metrics:
  duration: "2 minutes"
  completed: "2026-02-25T16:40:23Z"
  tasks_completed: 3
  files_modified: 2
---

# Phase 1 Plan 1: Foundation & Authorization Summary

## One-Liner

Tournament admin authorization layer with reusable helper and dashboard page

## Overview

This plan implements the authorization layer for tournament admin pages in the web portal. Discord OAuth (AUTH-01) was already implemented. The work involved creating an authorization helper, securing existing API endpoints, and ensuring the admin dashboard page exists.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Create requireTournamentAdmin() Authorization Helper | Complete | f492501 |
| 2 | Apply Authorization Helper to Existing Admin API Routes | Complete | e176c37 |
| 3 | Create Tournament Admin Dashboard Page | Complete | f492501 |

## Key Changes

### Authorization Helper (`apps/web/lib/tournament-admin.ts`)

Created a reusable authorization helper that:
- Validates NextAuth session exists (returns 401 if not authenticated)
- Finds user by discordId from session
- Queries TournamentAdmin table for userId + tournamentId + role in [OWNER, ADMIN, MODERATOR]
- Returns 403 if no admin role found
- Returns { userId, role, isAdmin: true } on success

Exported both `requireTournamentAdmin` (for API routes) and `requireTournamentAdminById` (for pages).

### API Route Refactoring

Applied the helper to two admin API routes:
- `apps/web/app/api/tournaments/[id]/admin/register/route.ts`
- `apps/web/app/api/tournaments/[id]/admin/registrations/route.ts`

Changes:
- Removed inline session and admin checks (~90 lines removed)
- Replaced with single call to `requireTournamentAdmin()`
- Maintained rate limiting and input validation
- Ensures 403 is returned for unauthorized access (AUTH-04)

### Admin Dashboard (`apps/web/app/tournaments/[id]/admin/page.tsx`)

Server component that:
- Calls `requireTournamentAdminById` at the top for authorization
- Fetches tournament with _count for registrations and events
- Displays tournament state, entrant count, and match count (DASH-02)
- Shows recent audit logs
- Provides quick links to registrations and matches management

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| User can access tournament admin pages only if they have TournamentAdmin role in database (AUTH-02) | Verified |
| API endpoints verify tournament admin role before returning data (AUTH-03) | Verified |
| Unauthorized access returns 403 instead of exposing data (AUTH-04) | Verified |
| Admin can view tournament dashboard at /tournaments/[id]/admin (DASH-01) | Verified |
| Dashboard shows tournament state, entrant count, and match count (DASH-02) | Verified |

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 3 were already implemented in a previous session.

## Self-Check

- [x] File exists: `apps/web/lib/tournament-admin.ts` - FOUND
- [x] Exports: `requireTournamentAdmin` function - FOUND
- [x] Exports: `TournamentAdminCheck` type - FOUND
- [x] Admin API routes use requireTournamentAdmin() - FOUND
- [x] Admin dashboard exists at /tournaments/[id]/admin - FOUND
- [x] TypeScript compiles without errors - PASSED
