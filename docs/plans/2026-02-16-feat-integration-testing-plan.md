---
title: Set up integration testing
type: feat
status: completed
date: 2026-02-16
issue: 35
---

# Set up Integration Testing

## Overview

The FightRise project has solid testing infrastructure in place (Vitest, Testcontainers, MSW mocks, Discord test harness, CI workflows), but lacks comprehensive integration tests for the core tournament flows. This issue focuses on **writing integration tests** for the major features, leveraging existing infrastructure.

## Problem Statement

Currently, the project has:
- Unit tests for some utility functions
- Basic test infrastructure (Vitest configs, seeders, mocks)
- CI running unit tests on PRs

What's missing:
- Integration tests for tournament flows (setup, registration, matches, scoring)
- Full coverage of bot command handlers
- API endpoint tests
- Integration tests running in CI

## Research Findings

### Existing Infrastructure

**Test Configuration:**
- `vitest.config.ts` - Unit tests in each package
- `vitest.integration.config.ts` - Integration tests
- `vitest.e2e.config.ts` / `vitest.smoke.config.ts` - E2E and smoke tests

**Test Utilities:**
- Discord test harness: `apps/bot/src/__tests__/harness/DiscordTestClient.ts`
- Database test setup: `packages/database/src/__tests__/setup.ts`
- Start.gg mocks: `packages/startgg-client/src/__mocks__/`
- Test seeders: `packages/database/src/__tests__/utils/seeders.ts`

**CI Workflows:**
- `.github/workflows/ci.yml` - Runs lint, typecheck, unit tests
- `.github/workflows/e2e.yml` - E2E tests
- `.github/workflows/smoke.yml` - Smoke tests against real APIs

### Gap Analysis

| Component | Unit Tests | Integration Tests | Status |
|-----------|------------|-------------------|--------|
| Discord commands | Some | None | Need to add |
| Bot services | Some | None | Need to add |
| Tournament flows | None | None | Need to create |
| Registration flow | None | None | Need to create |
| Match thread creation | None | None | Need to create |
| Check-in flow | None | None | Need to create |
| Score reporting | None | None | Need to create |
| Dispute resolution | None | None | Need to create |
| API endpoints | None | None | Need to create |

## Technical Approach

### 1. Integration Test Pattern

Follow existing patterns from CLAUDE.md:

```typescript
// Integration test example using test harness
import { createDiscordTestClient } from '../harness';
import { setupTestDatabase, clearTestDatabase } from '@fightrise/database';

describe('Tournament Setup Flow', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it('should setup tournament with all configurations', async () => {
    const client = createDiscordTestClient();
    const interaction = await client.executeCommand('tournament setup', {
      tournamentId: 'test-tournament-1',
      guildId: '123456789',
    });

    expect(interaction.lastReply?.content).toContain('Tournament configured');
  });
});
```

### 2. Test Categories & Locations

| Flow | Test Location | Approach |
|------|---------------|----------|
| Tournament setup | `apps/bot/src/__tests__/integration/tournament-setup.test.ts` | DiscordTestClient |
| Registration | `apps/bot/src/__tests__/integration/registration-flow.test.ts` | DiscordTestClient + Prisma |
| Match thread creation | `apps/bot/src/__tests__/integration/match-threads.test.ts` | DiscordTestClient |
| Check-in flow | `apps/bot/src/__tests__/integration/checkin-flow.test.ts` | DiscordTestClient |
| Score reporting | `apps/bot/src/__tests__/integration/score-reporting.test.ts` | DiscordTestClient |
| Dispute resolution | `apps/bot/src/__tests__/integration/disputes.test.ts` | DiscordTestClient + Prisma |
| API endpoints | `apps/web/app/api/__tests__/` | supertest or Playwright |

### 3. Test Utilities to Create/Enhance

- `apps/bot/src/__tests__/utils/integration-test-helpers.ts` - Shared helpers
- Add more seeders as needed for complex flows

## Implementation Plan

### Phase 1: Tournament Setup Flow Tests

- [x] Test `/tournament setup` command with valid inputs
- [x] Test `/tournament setup` with missing permissions
- [x] Test `/tournament status` command
- [x] Test tournament configuration stored in database

### Phase 2: Registration Flow Tests

- [x] Test `/register` command creates registration
- [x] Test registration sync from Start.gg
- [x] Test registration confirmation flow
- [x] Test duplicate registration handling

### Phase 3: Match Thread Creation Tests

- [x] Test match ready triggers thread creation
- [x] Test thread message content
- [x] Test player ping in thread
- [x] Test thread archiving on completion

### Phase 4: Check-in Flow Tests

- [x] Test check-in button appears for active match
- [x] Test check-in updates database
- [x] Test check-in timeout handling
- [x] Test check-in deadline extension

### Phase 5: Score Reporting Tests

- [x] Test score submission via button
- [x] Test loser confirmation flow
- [x] Test score reporting to Start.gg via mutation
- [x] Test dispute initiation

### Phase 6: Dispute Resolution Tests

- [x] Test dispute creation
- [x] Test admin dispute resolution
- [x] Test dispute timeout handling
- [x] TestDQ flow from dispute

### Phase 7: API Endpoint Tests

- [x] Test tournament GET endpoint
- [x] Test tournament POST endpoint
- [x] Test match status endpoints
- [x] Test auth-protected endpoints

### Phase 8: CI Integration

- [x] Add integration tests to CI workflow
- [x] Set up test database in CI
- [x] Configure test timeouts

## Acceptance Criteria

- [x] Integration tests exist for all 6 tournament flows
- [x] Integration tests exist for key API endpoints
- [x] All tests pass: `npm run docker:test:integration`
- [x] CI runs integration tests on every PR
- [x] Tests are documented with clear descriptions

## Success Metrics

- 6 integration test files for bot flows
- 3+ integration test files for API endpoints
- 80%+ pass rate on first run
- CI job completes in < 10 minutes

## Dependencies & Risks

**Dependencies:**
- Existing test harness and seeders (already in place)
- PostgreSQL service in CI (already configured)

**Risks:**
- Mocking Discord interactions - use DiscordTestClient which handles this
- Database isolation - use Testcontainers or CI-managed PostgreSQL
- Timing issues - use proper async/await and timeouts

## References

- Test harness: `apps/bot/src/__tests__/harness/`
- Seeders: `packages/database/src/__tests__/utils/seeders.ts`
- CI workflow: `.github/workflows/ci.yml`
- CLAUDE.md testing section
