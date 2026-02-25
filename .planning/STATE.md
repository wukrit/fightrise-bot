# State: FightRise Admin Web Portal

## Project Reference

**Project:** FightRise Admin Web Portal
**Core Value:** Run Start.gg tournaments entirely within Discord — now with web-based admin tools.
**Current Focus:** Roadmap creation

---

## Current Position

| Attribute | Value |
|-----------|-------|
| **Phase** | 01-foundation-authorization |
| **Plan** | 01 - Completed |
| **Status** | Phase 1 plan 1 complete |
| **Progress** | [##------] 14% |

---

## Roadmap Summary

| Phase | Goal | Requirements |
|-------|------|--------------|
| 1 - Foundation & Authorization | Unified admin permission model and basic dashboard | 7 |
| 2 - Registration Management | Full registration CRUD with audit logging | 15 |
| 3 - Match Management | Match list, details, and disqualification handling | 8 |

**Total:** 3 phases, 26 requirements

---

## Performance Metrics

- Requirements coverage: 26/26 (100%)
- Phases defined: 3
- Success criteria defined: 18

---

## Accumulated Context

### Research Findings

**Key insights from research:**

1. **Authorization Gap** - Discord admins lack web permissions. Must sync Discord roles to TournamentAdmin table.

2. **Critical Order** - Authorization before anything else to avoid security vulnerabilities.

3. **Audit Integration** - Every admin API endpoint must call existing auditService.

4. **No Caching** - Admin views must use `cache: 'no-store'` to avoid stale data.

### Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| RESTful API with Next.js Route Handlers | Matches existing patterns in apps/web/app/api/ |
| Server Actions for mutations | Recommended by research, reduces client JS |
| Server Components for admin pages | Fresh data fetching, no stale cache issues |
| Reusable `requireTournamentAdmin()` helper | Consistent authorization across routes |

### Dependencies Identified

1. **Phase 1 → Phase 2:** Registration API builds on admin auth established in Phase 1
2. **Phase 2 → Phase 3:** Match management depends on registration data being available
3. **All phases:** Must call auditService from bot for action logging

### Risks Identified

- **DQ-04:** Requires Start.gg GraphQL mutation - need to verify client has this capability
- **Authorization gap:** Discord admins not automatically web admins - needs explicit sync

---

## Session Continuity

**Last session:** 2026-02-25T17:08:01.565Z
**Completed tasks:**
- Authorization helper (requireTournamentAdmin) already existed
- Applied helper to admin/register and admin/registrations API routes
- Admin dashboard page already existed

**Next action:** Execute phase 01-foundation-authorization plan 02

---

*Last updated: 2026-02-25T16:40:23Z*
