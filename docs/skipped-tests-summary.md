# Skipped Tests Summary

This document catalogs all skipped tests in the codebase and explains why they are skipped.

---

## E2E Tests (Web)

### 1. Dashboard Page Tests
- **File**: `apps/web/__tests__/e2e/dashboard.spec.ts`
- **Status**: `test.describe.skip('Dashboard Page')`
- **Reason**: The `/dashboard` page does not exist yet. These tests verify dashboard page loading and error handling, but the page needs to be implemented first.

### 2. Tournament Flow Tests
- **File**: `apps/web/__tests__/e2e/tournaments.spec.ts`
- **Status**: `test.describe.skip('Tournament Flow')`
- **Reason**: The pages being tested do not exist yet. Specifically: `/tournaments`, `/matches`, `/dashboard`, and `/my-matches` need to be implemented.

### 3. Match Reporting Tests
- **File**: `apps/web/__tests__/e2e/matches.spec.ts`
- **Status**: `test.describe.skip('Match Reporting')`
- **Reason**: The `/matches` page does not exist yet. These tests verify match details viewing, score reporting, and result confirmation.

---

## Smoke Tests

Smoke tests are skipped when required credentials are not provided in environment variables. They are designed to run against real APIs in controlled environments.

### 4. Discord OAuth Smoke Tests
- **File**: `apps/web/__tests__/smoke/oauth.smoke.spec.ts`
- **Status**: `test.skip(SKIP_SMOKE_TESTS, ...)`
- **Skip Condition**: `!process.env.SMOKE_DISCORD_CLIENT_ID`
- **Reason**: Requires real Discord OAuth credentials (`SMOKE_DISCORD_CLIENT_ID`, `SMOKE_DISCORD_CLIENT_SECRET`, `SMOKE_OAUTH_REDIRECT_URI`). Should only run manually before releases or in controlled test environments - NOT on public CI to protect secrets.

### 5. Discord API Smoke Tests
- **File**: `apps/bot/src/__tests__/smoke/discord-api.smoke.test.ts`
- **Status**: `describe.skipIf(SKIP_SMOKE_TESTS)(...)`
- **Skip Condition**: `!process.env.SMOKE_DISCORD_TOKEN`
- **Reason**: Requires real Discord bot token (`SMOKE_DISCORD_TOKEN`, `SMOKE_DISCORD_GUILD_ID`, `SMOKE_DISCORD_CHANNEL_ID`). Tests verify Discord API connectivity.

### 6. Redis Connection Smoke Tests
- **File**: `apps/bot/src/__tests__/smoke/redis.smoke.test.ts`
- **Status**: `describe.skipIf(SKIP_SMOKE_TESTS)(...)`
- **Skip Condition**: `!process.env.REDIS_URL`
- **Reason**: Requires Redis connection (`REDIS_URL`). Tests verify Redis connectivity for BullMQ job queues.

### 7. Database Connection Smoke Tests
- **File**: `packages/database/src/__tests__/smoke/database.smoke.test.ts`
- **Status**: `describe.skipIf(SKIP_SMOKE_TESTS)(...)`
- **Skip Condition**: `!process.env.DATABASE_URL`
- **Reason**: Requires database connection (`DATABASE_URL`). Tests verify PostgreSQL connectivity and schema.

### 8. Start.gg API Smoke Tests
- **File**: `packages/startgg-client/src/__tests__/smoke/startgg-api.smoke.test.ts`
- **Status**: `describe.skipIf(SKIP_SMOKE_TESTS)(...)`
- **Skip Condition**: `!process.env.SMOKE_STARTGG_API_KEY`
- **Reason**: Requires real Start.gg API key (`SMOKE_STARTGG_API_KEY`, optional `SMOKE_STARTGG_TOURNAMENT_SLUG`). Tests verify Start.gg GraphQL API connectivity.

---

## Unit Tests

### 9. TournamentService Tests (Pre-existing failures)
- **File**: `apps/bot/src/services/__tests__/tournamentService.test.ts`
- **Status**: `it.skip(...)`
- **Skipped Tests**:
  1. `should successfully create tournament when all validations pass`
  2. `should mark as update when tournament already exists`
- **Reason**: These tests have incomplete mock setup. The `auditLog.create` mock was missing, and the transaction mock setup doesn't properly simulate the service's expected behavior. These failures pre-date the integration testing PR and need proper mock setup to fix.

---

## Summary

| Category | Count | Reason |
|----------|-------|--------|
| E2E (Pages not implemented) | 3 | Pages don't exist yet |
| Smoke Tests (Missing credentials) | 5 | Real API credentials not available in CI |
| Unit Tests (Broken mocks) | 2 | Incomplete mock setup (pre-existing) |
| **Total** | **10** | |

## Recommendations

1. **E2E Tests**: Implement the missing pages (`/dashboard`, `/tournaments`, `/matches`) to enable these tests
2. **Smoke Tests**: Already correctly configured - should only run in controlled environments with proper credentials
3. **Unit Tests**: Fix the mock setup in `tournamentService.test.ts` to make these tests pass
