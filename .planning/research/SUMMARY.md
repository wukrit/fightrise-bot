# Project Research Summary

**Project:** FightRise Testing Enhancements (v2.0)
**Domain:** Testing Infrastructure for Node.js/TypeScript Monorepo
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

FightRise v2.0 aims to add comprehensive test coverage across a Turborepo monorepo containing a Discord bot (discord.js v14, BullMQ) and Next.js 14 web portal. The project already has substantial testing infrastructure in place, including a Discord test harness, Testcontainers for PostgreSQL, MSW for Start.gg API mocking, and Playwright for E2E tests. The main task is expanding coverage rather than building infrastructure from scratch.

Research confirms the existing stack is well-suited. The only required change is upgrading vitest in the bot package from v1.0.0 to v4.0.18 for consistency. Critical pitfalls to avoid include testing implementation instead of behavior (causes brittle tests), inadequate test isolation (causes flaky tests), and over-mocking external dependencies (causes integration failures). The recommended approach is to prioritize critical user flows first: tournament setup through match completion.

## Key Findings

### Recommended Stack

The existing testing stack requires only one minor upgrade. All other tooling is already in place and well-suited for the goals.

**Core technologies:**
- **Vitest ^4.0.18** — Unit and integration test runner (upgrade bot from v1.0.0 for consistency)
- **Playwright v1.58.0** — E2E browser testing (complete, already configured)
- **MSW v2.0.0** — GraphQL API mocking for Start.gg (complete, handlers exist)
- **Testcontainers v10.0.0** — PostgreSQL containers for integration tests (complete)
- **@testing-library/react v14.0.0** — React component testing (complete)

### Expected Features

This is a test coverage enhancement project, so "features" represent test areas that need coverage.

**Must have (critical paths requiring tests):**
- Match service tests — Core thread creation and check-in handling
- Score handler tests — Score reporting and confirmation flow
- Tournament service tests — Setup and admin operations
- Registration API routes — Web admin CRUD endpoints

**Should have (important coverage):**
- Database model integration tests — All 11 Prisma models
- Button handler tests — Check-in, score, registration handlers
- E2E page tests — Dashboard, tournaments, matches

**Defer (lower ROI):**
- UI component tests in packages/ui/ — Lower priority than critical paths
- Load tests — Out of scope for v2.0
- Smoke tests against real APIs — Require credentials, can run ad-hoc

### Architecture Approach

The architecture follows a three-layer strategy: Unit tests (Vitest with mocks) for fast feedback on pure functions and service logic; Integration tests (Vitest + Testcontainers + MSW) for testing with real database and mocked external APIs; E2E tests (Playwright) for full user flows in the browser.

**Major components:**
1. **DiscordTestClient** — In-memory mock of Discord.js client for command/button testing without real Discord connection
2. **Testcontainers** — Isolated PostgreSQL containers spun up per test suite for database integration tests
3. **MSW Handlers** — Intercept HTTP requests to mock Start.gg GraphQL API responses

### Critical Pitfalls

1. **Testing Implementation Instead of Behavior** — Tests break whenever implementation details change, becoming maintenance burden. Assert on outcomes (messages sent, database state) not internal calls.

2. **Inadequate Test Isolation** — Tests affect each other through shared state, causing flaky tests. Use `clearTestDatabase()`, reset mocks in `beforeEach`, use unique IDs per test.

3. **Over-Mocking External Dependencies** — Tests pass but integration fails at runtime. Have a mix of mocked unit tests and real integration tests.

4. **Not Testing Error Paths** — Tests only cover happy path. Production fails on errors never tested. Add error case tests alongside happy path.

5. **Ignoring Async Timing** — Tests pass locally but fail in CI due to race conditions. Always await async, use `waitForEvent()` helper.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Bot Service Unit Tests
**Rationale:** Bot services contain the core business logic (match handling, score reporting, tournament management). Testing these first provides the highest confidence in critical flows.

**Delivers:**
- Unit tests for matchService.ts, scoreHandler.ts, checkinHandler.ts, tournamentService.ts, dqService.ts
- Uses existing DiscordTestClient harness with vi.mock for Prisma

**Addresses:**
- Critical paths: Tournament Setup -> Registration -> Check-in -> Match flow
- scoreHandler.ts - Score reporting critical path

**Avoids:** Pitfall #1 (testing behavior not implementation) by asserting on messages/database state

**Research Flags:** Standard patterns — Discord test harness already exists, well-documented

### Phase 2: Web API Integration Tests
**Rationale:** Web API routes connect database to web portal. After bot services are tested, the web API routes are the next critical integration point.

**Delivers:**
- Integration tests for all registration and match API routes
- Uses Testcontainers for real PostgreSQL

**Addresses:**
- API routes: /api/tournaments/[id]/register, /api/tournaments/[id]/matches, /api/matches/[id]/report, /api/matches/[id]/dispute, /api/matches/[id]/dq

**Avoids:** Pitfall #3 (over-mocking) by using real database

**Research Flags:** Standard patterns — Vitest + Testcontainers pattern well-established

### Phase 3: Database Model Integration Tests
**Rationale:** All services depend on database operations. Testing models ensures Prisma operations work correctly before expanding coverage.

**Delivers:**
- Integration tests for all 11 Prisma models (User, Tournament, Event, Match, MatchPlayer, GameResult, Dispute, Registration, TournamentAdmin, GuildConfig, AuditLog)

**Addresses:**
- All model CRUD operations
- Transaction patterns used in services

**Avoids:** Pitfall #6 (transaction boundaries) by testing real transactions

### Phase 4: E2E Page Tests
**Rationale:** After services and APIs are tested, E2E tests verify the full user experience in the browser.

**Delivers:**
- Playwright tests for: Dashboard, Tournament list/detail, Tournament registrations, Tournament matches, Admin pages, Account

**Addresses:**
- Web page user flows with mocked auth

**Avoids:** Pitfall #9 (network variability) by using Playwright auto-waiting and networkidle

**Research Flags:** May need research — Auth mocking patterns for NextAuth v5 may need verification

### Phase Ordering Rationale

- **Why bot services first:** They contain the most complex logic (Discord interactions, BullMQ workers, Start.gg sync) and have existing test infrastructure
- **Why web API second:** Database operations are simpler, but testing against real DB catches issues that mocks miss
- **Why database models third:** Ensures Prisma layer works correctly before E2E tests depend on it
- **Why E2E last:** Browser tests are slowest and most expensive; validate lower layers first

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (E2E):** Auth mocking for NextAuth v5 may need verification during implementation — existing auth utils may need updates

Phases with standard patterns (skip research-phase):
- **Phase 1:** DiscordTestClient harness exists and is well-documented
- **Phase 2:** Vitest + Testcontainers pattern is standard
- **Phase 3:** Prisma testing patterns are well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing infrastructure verified, only vitest upgrade needed |
| Features | HIGH | Clear understanding of what needs testing based on existing code |
| Architecture | HIGH | Multi-layer testing architecture well-established |
| Pitfalls | HIGH | Common testing pitfalls well-documented, existing infrastructure addresses most |

**Overall confidence:** HIGH

### Gaps to Address

- **Bot handler tests:** Some button handlers (registration.ts flow) may need additional test utilities beyond existing harness — handle during Phase 1 implementation
- **NextAuth v5 auth mocking:** If web uses NextAuth v5, auth utilities may need updates — verify during Phase 4 planning

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/bot/src/__tests__/harness/` — DiscordTestClient implementation
- Existing codebase: `packages/database/src/__tests__/setup.ts` — Testcontainers setup
- Existing codebase: `packages/startgg-client/src/__mocks__/handlers.ts` — MSW handlers
- Vitest Documentation (https://vitest.dev/) — Test runner configuration
- Playwright Documentation (https://playwright.dev/) — E2E testing

### Secondary (MEDIUM confidence)
- discord.js Testing Guide (https://discordjs.guide/testing/) — Bot testing patterns
- Prisma Testing Best Practices (https://www.prisma.io/docs/guides/testing) — Database testing

### Tertiary (LOW confidence)
- None — All primary sources are existing codebase and official documentation

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
