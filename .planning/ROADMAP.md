# Roadmap: FightRise Testing Enhancements

## Milestones

- ✅ **v1.0 Admin Web Portal** — Phases 1-4 (shipped 2026-02-26)
- 🔄 **v2.0 Testing Enhancements** — Phases 5-8 (in progress)

## Phases

- [x] **Phase 5: Bot Services Unit Tests** — Unit tests for bot services and shared utilities (completed 2026-02-27)
- [x] **Phase 6: Web API + Start.gg Integration Tests** — API route and Start.gg client tests (completed 2026-02-26)
- [ ] **Phase 7: Database Model Integration Tests** — Integration tests for all Prisma models
- [ ] **Phase 8: E2E Page Tests** — Playwright browser tests for web portal pages

---

## Phase Details

### Phase 5: Bot Services Unit Tests

**Goal**: Bot services and shared utilities have comprehensive unit tests with documented patterns

**Depends on**: Nothing (first phase of v2.0)

**Requirements**: ANALYSIS-01, ANALYSIS-02, ANALYSIS-03, BOT-01, BOT-02, BOT-03, BOT-04, BOT-05, BOT-06, BOT-07, SHR-01, SHR-02

**Success Criteria** (what must be TRUE):
  1. All 7 bot services have passing unit tests (matchService, scoreHandler, checkinHandler, tournamentService, dqService, registrationSyncService, pollingService)
  2. Analysis complete: test coverage gaps identified and documented
  3. Test patterns documented for consistency across codebase
  4. Shared utility tests pass (validation schemas, error classes)
  5. Bot service tests achieve 80%+ code coverage

**Plans**:
- [x] 05-01-PLAN.md — Handler tests (scoreHandler, checkinHandler) [COMPLETE]
- [x] 05-02-PLAN.md — tournamentService and dqService tests [COMPLETE]
- [x] 05-03-PLAN.md — Run tests and document coverage [COMPLETE]
- [ ] 05-04-PLAN.md — pollingService tests
- [x] 05-05-PLAN.md — registrationSyncService tests [COMPLETE]

---

### Phase 6: Web API + Start.gg Integration Tests

**Goal**: Web API routes and Start.gg client tested with real database and mocked external API

**Depends on**: Phase 5

**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, SGG-01, SGG-02, SGG-03

**Success Criteria** (what must be TRUE):
  1. All 6 API route integration tests pass using Testcontainers
  2. Start.gg GraphQL query integration tests pass with MSW mocking
  3. Start.gg GraphQL mutation integration tests pass with MSW mocking
  4. Client retry logic and error handling tests pass
  5. API tests cover both success and error paths

**Plans**:
- [x] 06-01-PLAN.md — Tournament API tests (registrations, matches) [COMPLETE]
- [x] 06-02-PLAN.md — Match API tests (report, dispute, dq) [COMPLETE]
- [x] 06-03-PLAN.md — Start.gg client integration tests [COMPLETE]
- [x] 06-04-PLAN.md — Retry logic and audit API tests [COMPLETE]
- [x] 06-03-PLAN.md — Start.gg client tests (queries, mutations) [PLANNED]
- [x] 06-04-PLAN.md — Retry logic and audit API tests [PLANNED]

---

### Phase 7: Database Model Integration Tests

**Goal**: All 11 Prisma models have integration tests with Testcontainers

**Depends on**: Phase 6

**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11

**Success Criteria** (what must be TRUE):
  1. All 11 Prisma models have CRUD integration tests passing
  2. User, Tournament, Event, Match models fully tested
  3. MatchPlayer, GameResult, Dispute models fully tested
  4. Registration, TournamentAdmin, GuildConfig, AuditLog models fully tested
  5. Transaction patterns tested and verified

**Plans**: TBD

---

### Phase 8: E2E Page Tests

**Goal**: Web portal user flows verified through Playwright browser tests

**Depends on**: Phase 7

**Requirements**: E2E-01, E2E-02, E2E-03, E2E-04, E2E-05, E2E-06, E2E-07

**Success Criteria** (what must be TRUE):
  1. Dashboard page E2E tests pass with mocked auth
  2. Tournaments list page E2E tests pass
  3. Tournament detail page E2E tests pass
  4. Tournament registrations admin page E2E tests pass
  5. Tournament matches admin page E2E tests pass
  6. Admin audit log page E2E tests pass
  7. Account settings page E2E tests pass

**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Bot Services Unit Tests | 4/5 | Complete    | 2026-02-27 |
| 6. Web API + Start.gg Integration | 4/4 | Complete    | 2026-02-26 |
| 7. Database Model Integration | 0/1 | Not started | - |
| 8. E2E Page Tests | 0/1 | Not started | - |

---

*Last updated: 2026-02-26 during roadmap creation*
