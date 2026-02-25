---
phase: 03-match-management
plan: '02'
subsystem: web-portal-admin
tags:
  - match-management
  - admin-ui
  - dq-flow
dependency_graph:
  requires:
    - MATCH-01
    - MATCH-02
    - MATCH-03
    - DQ-01
    - DQ-02
  provides:
    - Match list page with filters
    - Expandable match details
    - DQ confirmation modal
  affects:
    - apps/web/app/tournaments/[id]/admin/matches/page.tsx
    - apps/web/components/admin/ClientMatchesTable.tsx
    - apps/web/components/admin/MatchesTable.tsx
    - apps/web/components/admin/MatchDetail.tsx
    - apps/web/components/admin/DQModal.tsx
    - apps/web/components/admin/MatchFilters.tsx
tech_stack:
  added:
    - Radix Select for dropdown filters
    - Radix Dialog for DQ modal
    - Radix Tooltip for check-in icons
  patterns:
    - Server Component with Client Table
    - Auto-refresh every 30 seconds
    - Expandable rows with inline details
key_files:
  created:
    - apps/web/app/tournaments/[id]/admin/matches/page.tsx
    - apps/web/components/admin/ClientMatchesTable.tsx
    - apps/web/components/admin/MatchesTable.tsx
    - apps/web/components/admin/MatchDetail.tsx
    - apps/web/components/admin/DQModal.tsx
    - apps/web/components/admin/MatchFilters.tsx
decisions:
  - Use inline expandable rows instead of separate detail page
  - Two-step DQ flow (click row, then confirm)
  - Optional reason field for DQ
  - Color-coded check-in icons (green/yellow/red)
metrics:
  duration: ~28 minutes
  completed_date: 2026-02-25
  tasks_completed: 4
---

# Phase 03 Plan 02: Match Management UI Summary

## Overview

Built the Match Management UI page for tournament admins to view matches, see detailed player information including check-in status, and disqualify players through a confirmation modal.

## What Was Built

### 1. Matches Page Server Component
- Located at `/tournaments/[id]/admin/matches`
- Uses `requireTournamentAdminById` for authorization
- Fetches initial matches data with filters (state, round, playerName)
- Supports pagination (50 per page)
- Links to audit log in header

### 2. Client Matches Table
- Maintains local state for matches
- Auto-refreshes every 30 seconds via setInterval
- Renders MatchFilters and MatchesTable components
- Handles DQ action - calls API, shows toast, refreshes data

### 3. Matches Table UI with Expandable Rows
- Full columns: Round, Player 1, Player 2, Score, Status
- Color-coded badges: green=COMPLETED, yellow=IN_PROGRESS/DQ, red=DISPUTED
- Round labels include bracket type
- Click row to expand inline details
- Shows "X/Y checked in" summary in collapsed row

### 4. Match Detail (Expanded Content)
- Shows both players with full details
- Player names: Discord username and Start.gg gamer tag
- Score format: "2-1"
- Check-in info: color + icon (green check, red X, yellow clock)
- Relative timestamps using custom helper
- DQ button in expanded section

### 5. Match Filters
- Search input for player name (debounced)
- Dropdown for round filter (Radix Select)
- Dropdown for state filter (Radix Select)
- Clear filters button when filters active

### 6. DQ Modal
- Two-step flow (click player row, then confirm)
- Uses Radix Dialog
- Shows "Are you sure?" confirmation
- Optional reason input
- Type "DISQUALIFY" to confirm
- Calls POST /api/tournaments/[id]/admin/players/[playerId]/dq
- Shows toast feedback on success/error

## Verification

- Page accessible at /tournaments/[id]/admin/matches with authorization
- Matches display in table with all columns
- Row click expands to show MatchDetail
- MatchDetail shows players, scores, check-in status with color-coded icons
- Filters work (search, round dropdown, state dropdown)
- Auto-refresh updates data every 30 seconds
- DQ button triggers modal
- DQ modal shows confirmation, accepts optional reason
- After DQ, table refreshes and shows updated state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dockerfile.web missing startgg-client package**
- **Found during:** Task 1 verification
- **Issue:** The web Dockerfile was missing the startgg-client package, causing build failures
- **Fix:** Added startgg-client to package copies and build steps in Dockerfile.web
- **Files modified:** docker/Dockerfile.web

**2. [Rule 1 - Bug] Prisma filter syntax error in matches API**
- **Found during:** Build verification
- **Issue:** The player name filter in matches API used incorrect Prisma syntax
- **Fix:** Changed to use `some` operator with proper nested OR filtering
- **Files modified:** apps/web/app/api/tournaments/[id]/admin/matches/route.ts

**3. [Rule 1 - Bug] Missing date-fns dependency**
- **Found during:** Build verification
- **Issue:** MatchDetail imported date-fns but it wasn't installed
- **Fix:** Replaced with simple custom relative time function
- **Files modified:** apps/web/components/admin/MatchDetail.tsx

**4. [Rule 1 - Bug] Type errors in page data transformation**
- **Found during:** Build verification
- **Issue:** Date fields (checkInDeadline, checkedInAt) weren't converted to strings
- **Fix:** Added .toISOString() conversions for date fields
- **Files modified:** apps/web/app/tournaments/[id]/admin/matches/page.tsx

## Self-Check

- [x] All created files exist
- [x] Build passes
- [x] Tests pass (unit + integration)
- [x] All verification criteria met

## Notes

- The plan was fully autonomous with no checkpoints
- Build/test verification took multiple iterations due to pre-existing infrastructure issues (missing npm packages in Docker)
- ESLint warning in MatchFilters.tsx about useEffect dependencies is non-blocking
