# Roadmap: FightRise Admin Web Portal

## Project Context

**Core Value:** Run Start.gg tournaments entirely within Discord — now with web-based admin tools.

**Depth:** Comprehensive
**Mode:** Yolo

---

## Phases

- [ ] **Phase 1: Foundation & Authorization** - Unified admin permission model and basic dashboard
- [ ] **Phase 2: Registration Management** - Full registration CRUD with audit logging
- [x] **Phase 3: Match Management** - Match list, details, and disqualification handling (completed 2026-02-25)
- [ ] **Phase 4: Fix Audit Page Tournament Filtering** - Close integration gap from audit

---

## Phase Details

### Phase 1: Foundation & Authorization

**Goal:** Users can securely access tournament admin pages with proper role-based authorization.

**Depends on:** Nothing (first phase)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, API-01, DASH-01, DASH-02

**Success Criteria** (what must be TRUE):

1. User can sign in via Discord OAuth and see their authenticated state
2. User can access tournament admin pages only if they have TournamentAdmin role in database
3. API endpoints verify tournament admin role before returning data
4. Unauthorized access returns 403 instead of exposing data
5. Tournament dashboard displays tournament state, entrant count, and match count
6. Dashboard shows recent admin actions from audit logs

**Plans:** 1/1 plans executed

---

### Phase 2: Registration Management

**Goal:** Admins can manage tournament registrations through both API and web interface.

**Depends on:** Phase 1

**Requirements:** API-02, API-03, API-04, API-05, API-07, DASH-03, REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, AUDIT-01, AUDIT-02, AUDIT-03

**Success Criteria** (what must be TRUE):

1. Admin can view all registrations in a table with status filters (pending, confirmed, cancelled)
2. Admin can approve pending registrations with a single action
3. Admin can reject registrations with a reason input
4. Admin can manually register a player (walk-in) with player search
5. Admin can remove a registration from the tournament
6. Registration table supports pagination (10+ per page)
7. Admin can view audit log showing action, user, timestamp, and details
8. Audit log supports filtering by action type (registration created, updated, deleted)
9. Dashboard shows recent admin actions

**Plans:** 1/1 plans executed

---

### Phase 3: Match Management

**Goal:** Admins can view matches, check player status, and handle disqualifications.

**Depends on:** Phase 2

**Requirements:** API-06, MATCH-01, MATCH-02, MATCH-03, DQ-01, DQ-02, DQ-03, DQ-04

**Success Criteria** (what must be TRUE):

1. Admin can view all matches in a table with filters by round and state
2. Admin can view match details showing players and their scores
3. Admin can view check-in status for each match (checked in, not checked in, timed out)
4. Admin can disqualify a player from a match via button/menu action
5. DQ form requires reason input before submission
6. DQ action creates audit log entry automatically
7. DQ syncs to Start.gg via GraphQL mutation

**Plans:** 2/2 plans complete

Plans:
- [ ] 03-01-PLAN.md — Match Management API (matches list + DQ endpoint)
- [ ] 03-02-PLAN.md — Match Management UI (expandable table + DQ modal)

---

### Phase 4: Fix Audit Page Tournament Filtering

**Goal:** Fix server-side audit page to filter by tournament ID, closing the data isolation security gap.

**Depends on:** Phase 3

**Requirements:** AUDIT-01, AUDIT-02, AUDIT-03 (already satisfied, fixing integration gap)

**Gap Closure:** Closes integration gap AUDIT-PAGE-FILTER and flow gap AUDIT-E2E from v1.0 audit

**Success Criteria** (what must be TRUE):

1. Server-side audit page filters audit logs by tournamentId parameter
2. No audit logs from other tournaments are exposed to admins
3. Server-side filtering matches the API route filtering behavior

**Plans:** 1/1 plans

Plans:
- [x] 04-01-PLAN.md — Fix audit page tournament filtering

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authorization | 1/1 | Complete | Auth + Dashboard |
| 2. Registration Management | 2/2 | Complete | API + UI |
| 3. Match Management | 2/2 | Complete   | 2026-02-25 |
| 4. Fix Audit Page Filtering | 0/1 | In Progress | — |

---

## Coverage

- Total v1 requirements: 26
- Mapped to phases: 26
- Unmapped: 0

**Requirement Mapping:**

| Phase | Requirements |
|-------|--------------|
| Phase 1 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, API-01, DASH-01, DASH-02 (7) |
| Phase 2 | API-02, API-03, API-04, API-05, API-07, DASH-03, REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, AUDIT-01, AUDIT-02, AUDIT-03 (15) |
| Phase 3 | API-06, MATCH-01, MATCH-02, MATCH-03, DQ-01, DQ-02, DQ-03, DQ-04 (8) |
| Phase 4 | AUDIT-01, AUDIT-02, AUDIT-03 (gap closure) |

---

## Notes

- Phase 3 DQ-04 requires Start.gg API mutation - verify existing client has the capability
- All admin API endpoints must call auditService for logging (research recommendation)
- No caching for admin views - use `cache: 'no-store'` for fresh data
- Authorization gap between Discord and web must be solved in Phase 1

---

*Last updated: 2026-02-26*
