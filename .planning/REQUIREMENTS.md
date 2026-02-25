# Requirements: FightRise Admin Web Portal

**Defined:** 2026-02-25
**Core Value:** Run Start.gg tournaments entirely within Discord — now with web-based admin tools.

## v1 Requirements

### Authentication & Authorization

- [ ] **AUTH-01**: User can sign in via Discord OAuth
- [ ] **AUTH-02**: User can access tournament admin pages only if they have TournamentAdmin role in database
- [ ] **AUTH-03**: API endpoints verify tournament admin role before returning data
- [ ] **AUTH-04**: Unauthorized access returns 403 instead of exposing data

### Admin API

- [ ] **API-01**: GET /api/tournaments/[id]/admin/registrations - List registrations with filters
- [ ] **API-02**: POST /api/tournaments/[id]/admin/registrations - Create manual registration
- [ ] **API-03**: PATCH /api/tournaments/[id]/admin/registrations/[id] - Update registration status
- [ ] **API-04**: DELETE /api/tournaments/[id]/admin/registrations/[id] - Remove registration
- [ ] **API-05**: GET /api/tournaments/[id]/admin/matches - List matches with filters
- [ ] **API-06**: POST /api/tournaments/[id]/admin/players/[id]/dq - Disqualify player
- [ ] **API-07**: GET /api/tournaments/[id]/admin/audit - List audit logs

### Admin UI - Dashboard

- [ ] **DASH-01**: Admin can view tournament dashboard at /tournaments/[id]/admin
- [ ] **DASH-02**: Dashboard shows tournament state, entrant count, match count
- [ ] **DASH-03**: Dashboard shows recent admin actions

### Admin UI - Registrations

- [ ] **REG-01**: Admin can view all registrations in a table with status filters
- [ ] **REG-02**: Admin can approve pending registrations
- [ ] **REG-03**: Admin can reject registrations with reason
- [ ] **REG-04**: Admin can manually register a player (walk-in)
- [ ] **REG-05**: Admin can remove a registration
- [ ] **REG-06**: Registration table supports pagination

### Admin UI - Matches

- [ ] **MATCH-01**: Admin can view all matches in a table with filters (round, state)
- [ ] **MATCH-02**: Admin can view match details (players, scores)
- [ ] **MATCH-03**: Admin can view check-in status for matches

### Admin UI - Disqualification

- [ ] **DQ-01**: Admin can disqualify a player from a match
- [ ] **DQ-02**: DQ form requires reason input
- [ ] **DQ-03**: DQ action creates audit log entry
- [ ] **DQ-04**: DQ syncs to Start.gg via API

### Admin UI - Audit Logs

- [ ] **AUDIT-01**: Admin can view audit log for tournament
- [ ] **AUDIT-02**: Audit log shows action, user, timestamp, details
- [ ] **AUDIT-03**: Audit log supports filtering by action type

## v2 Requirements

### Advanced Features

- **SEED-01**: Admin can reorder seeding via drag-drop
- **CHECK-01**: Admin can view real-time check-in dashboard
- **CHECK-02**: Admin can send check-in reminders
- **STATE-01**: Admin can override match state (emergency)
- **BRACKET-01**: Embed Start.gg bracket viewer

### Export

- **EXP-01**: Export registrations to CSV
- **EXP-02**: Export match results to CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Tournament creation from web | Use Discord bot for v1 |
| Full bracket editor | Sync issues with Start.gg - embed instead |
| Bulk messaging | Rate limiting complexity |
| Multi-event management | Defer to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| API-01 | Phase 1 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| API-06 | Phase 3 | Pending |
| API-07 | Phase 2 | Pending |
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 1 | Pending |
| DASH-03 | Phase 2 | Pending |
| REG-01 | Phase 2 | Pending |
| REG-02 | Phase 2 | Pending |
| REG-03 | Phase 2 | Pending |
| REG-04 | Phase 2 | Pending |
| REG-05 | Phase 2 | Pending |
| REG-06 | Phase 2 | Pending |
| MATCH-01 | Phase 3 | Pending |
| MATCH-02 | Phase 3 | Pending |
| MATCH-03 | Phase 3 | Pending |
| DQ-01 | Phase 3 | Pending |
| DQ-02 | Phase 3 | Pending |
| DQ-03 | Phase 3 | Pending |
| DQ-04 | Phase 3 | Pending |
| AUDIT-01 | Phase 2 | Pending |
| AUDIT-02 | Phase 2 | Pending |
| AUDIT-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
