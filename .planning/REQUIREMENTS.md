# Requirements: FightRise Testing Enhancements

**Defined:** 2026-02-26
**Core Value:** Run Start.gg tournaments entirely within Discord — now with comprehensive test coverage.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Analysis & Planning

- [ ] **ANALYSIS-01**: Analyze existing test coverage and identify gaps vs requirements
- [ ] **ANALYSIS-02**: Document existing test patterns and utilities for consistency
- [ ] **ANALYSIS-03**: Identify test infrastructure improvements needed

### Bot Services

- [ ] **BOT-01**: Unit tests for matchService.ts (thread creation, check-in handling)
- [ ] **BOT-02**: Unit tests for scoreHandler.ts (score reporting, confirmation flow)
- [ ] **BOT-03**: Unit tests for checkinHandler.ts (check-in button interactions)
- [ ] **BOT-04**: Unit tests for tournamentService.ts (setup, admin operations)
- [ ] **BOT-05**: Unit tests for dqService.ts (disqualification handling)
- [ ] **BOT-06**: Unit tests for registrationSyncService.ts (Start.gg sync)
- [ ] **BOT-07**: Unit tests for pollingService.ts (BullMQ job processing)

### Web API Routes

- [ ] **API-01**: Integration tests for /api/tournaments/[id]/registrations
- [ ] **API-02**: Integration tests for /api/tournaments/[id]/matches
- [ ] **API-03**: Integration tests for /api/matches/[id]/report
- [ ] **API-04**: Integration tests for /api/matches/[id]/dispute
- [ ] **API-05**: Integration tests for /api/matches/[id]/dq
- [ ] **API-06**: Integration tests for /api/tournaments/[id]/admin/audit

### Database Models

- [ ] **DB-01**: Integration tests for User model CRUD
- [ ] **DB-02**: Integration tests for Tournament model CRUD
- [ ] **DB-03**: Integration tests for Event model CRUD
- [ ] **DB-04**: Integration tests for Match model CRUD
- [ ] **DB-05**: Integration tests for MatchPlayer model CRUD
- [ ] **DB-06**: Integration tests for GameResult model CRUD
- [ ] **DB-07**: Integration tests for Dispute model CRUD
- [ ] **DB-08**: Integration tests for Registration model CRUD
- [ ] **DB-09**: Integration tests for TournamentAdmin model CRUD
- [ ] **DB-10**: Integration tests for GuildConfig model CRUD
- [ ] **DB-11**: Integration tests for AuditLog model CRUD

### E2E Page Tests

- [ ] **E2E-01**: E2E tests for dashboard page (user overview)
- [ ] **E2E-02**: E2E tests for tournaments list page
- [ ] **E2E-03**: E2E tests for tournament detail page
- [ ] **E2E-04**: E2E tests for tournament registrations admin page
- [ ] **E2E-05**: E2E tests for tournament matches admin page
- [ ] **E2E-06**: E2E tests for admin audit log page
- [ ] **E2E-07**: E2E tests for account settings page

### Shared Utilities

- [ ] **SHR-01**: Unit tests for validation schemas in packages/shared
- [ ] **SHR-02**: Unit tests for error classes in packages/shared

### Start.gg Client

- [ ] **SGG-01**: Integration tests for GraphQL query functions
- [ ] **SGG-02**: Integration tests for GraphQL mutation functions
- [ ] **SGG-03**: Tests for client retry logic and error handling

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional Testing

- **TEST-01**: UI component tests for packages/ui
- **TEST-02**: Load testing for API endpoints
- **TEST-03**: Smoke tests against real Start.gg API
- **TEST-04**: Visual regression tests for web portal

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time match updates (WebSocket) | High complexity, defer |
| Tournament creation from web | Can use Discord bot for v1 |
| Load testing | Lower priority, requires infrastructure |
| Visual regression tests | UI stable, not core value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANALYSIS-01 | Phase 5 | Pending |
| ANALYSIS-02 | Phase 5 | Pending |
| ANALYSIS-03 | Phase 5 | Pending |
| BOT-01 | Phase 5 | Pending |
| BOT-02 | Phase 5 | Pending |
| BOT-03 | Phase 5 | Pending |
| BOT-04 | Phase 5 | Pending |
| BOT-05 | Phase 5 | Pending |
| BOT-06 | Phase 5 | Pending |
| BOT-07 | Phase 5 | Pending |
| API-01 | Phase 6 | Pending |
| API-02 | Phase 6 | Pending |
| API-03 | Phase 6 | Pending |
| API-04 | Phase 6 | Pending |
| API-05 | Phase 6 | Pending |
| API-06 | Phase 6 | Pending |
| DB-01 | Phase 7 | Pending |
| DB-02 | Phase 7 | Pending |
| DB-03 | Phase 7 | Pending |
| DB-04 | Phase 7 | Pending |
| DB-05 | Phase 7 | Pending |
| DB-06 | Phase 7 | Pending |
| DB-07 | Phase 7 | Pending |
| DB-08 | Phase 7 | Pending |
| DB-09 | Phase 7 | Pending |
| DB-10 | Phase 7 | Pending |
| DB-11 | Phase 7 | Pending |
| E2E-01 | Phase 8 | Pending |
| E2E-02 | Phase 8 | Pending |
| E2E-03 | Phase 8 | Pending |
| E2E-04 | Phase 8 | Pending |
| E2E-05 | Phase 8 | Pending |
| E2E-06 | Phase 8 | Pending |
| E2E-07 | Phase 8 | Pending |
| SHR-01 | Phase 5 | Pending |
| SHR-02 | Phase 5 | Pending |
| SGG-01 | Phase 6 | Pending |
| SGG-02 | Phase 6 | Pending |
| SGG-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
