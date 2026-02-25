# Phase 1: Foundation & Authorization - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely access tournament admin pages with proper role-based authorization. Includes: admin auth helper, registration list API endpoint, tournament dashboard UI.

</domain>

<decisions>
## Implementation Decisions

### Authorization Model
- Use existing TournamentAdmin database model (OWNER/ADMIN/MODERATOR roles)
- Create requireTournamentAdmin() helper combining NextAuth session + Prisma check
- API endpoints verify role before returning data (403 on unauthorized)

### Dashboard Layout
- Central admin view at /tournaments/[id]/admin
- Shows: tournament state, entrant count, match count
- Shows recent audit log entries (last 10)

### API Structure
- REST API at /api/tournaments/[id]/admin/*
- Use existing Route Handler pattern from codebase
- No caching for admin views (cache: 'no-store')

</decisions>

<specifics>
## Specific Ideas

No specific references from user — open to standard admin dashboard patterns.

</specifics>

<deferred>
## Deferred Ideas

- Discord role sync — Phase 1 focuses on web admin auth
- Real-time updates — defer to later phase

</deferred>

---
*Phase: 01-foundation-authorization*
*Context gathered: 2026-02-25*
