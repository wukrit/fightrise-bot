# Skipped Tests Analysis

This document catalogs all skipped tests in the codebase, explains why they are skipped, and proposes solutions for re-enabling them.

---

## Table of Contents

1. [Database Model Integration Tests](#database-model-integration-tests)
2. [UI Component Tests](#ui-component-tests)
3. [Web Component Tests](#web-component-tests)
4. [Web Page Tests](#web-page-tests)
5. [Smoke Tests](#smoke-tests)
6. [Bot Load Tests](#bot-load-tests)
7. [Bot Unit Tests](#bot-unit-tests)
8. [Start.gg Client Tests](#startgg-client-tests)
9. [Summary and Recommendations](#summary-and-recommendations)

---

## 1. Database Model Integration Tests

All database model tests are skipped because they require **Testcontainers** (Docker) to spin up isolated PostgreSQL databases.

### Files Skipped

| File | Model |
|------|-------|
| `packages/database/src/__tests__/models/User.test.ts` | User |
| `packages/database/src/__tests__/models/Tournament.test.ts` | Tournament |
| `packages/database/src/__tests__/models/Event.test.ts` | Event |
| `packages/database/src/__tests__/models/Match.test.ts` | Match |
| `packages/database/src/__tests__/models/MatchPlayer.test.ts` | MatchPlayer |
| `packages/database/src/__tests__/models/GameResult.test.ts` | GameResult |
| `packages/database/src/__tests__/models/Registration.test.ts` | Registration |
| `packages/database/src/__tests__/models/TournamentAdmin.test.ts` | TournamentAdmin |
| `packages/database/src/__tests__/models/GuildConfig.test.ts` | GuildConfig |
| `packages/database/src/__tests__/models/AuditLog.test.ts` | AuditLog |
| `packages/database/src/__tests__/models/Dispute.test.ts` | Dispute |

### Why They're Skipped

The tests use `setupTestDatabase()` from `packages/database/src/__tests__/setup.ts`, which:
1. Starts a PostgreSQL container using `@testcontainers/postgresql`
2. Pushes the Prisma schema to the container
3. Returns a connected `PrismaClient`

This requires Docker to be running on the machine executing tests. In CI environments without Docker (or where Docker is unavailable), these tests cannot run.

### Proposed Solution

**Option A: CI Pipeline Enhancement (Recommended)**
- Configure GitHub Actions to run with Docker-in-Docker (DinD) enabled
- Enable the `setup-docker-buildx` action in the test workflow
- Add `packages/database/src/__tests__/models/*.test.ts` to the integration test suite

**Option B: Use Docker Compose for Integration Tests**
- Add a dedicated `docker-compose.test.yml` with PostgreSQL service
- Run database tests against this service instead of Testcontainers
- Update test setup to use `DATABASE_URL` from environment when available

**Option C: Conditional Test Execution**
- Create a `describe.runIfDockerAvailable()` helper that checks Docker availability
- Skip tests gracefully with informative messages when Docker is unavailable
- Keep current skip behavior as fallback

---

## 2. UI Component Tests

All UI component tests are skipped - they appear to be tests written for components but never actually run.

### Files Skipped

| File | Component |
|------|-----------|
| `packages/ui/src/Button.test.tsx` | Button |
| `packages/ui/src/UserAvatar.test.tsx` | UserAvatar |
| `packages/ui/src/DiscordIcon.test.tsx` | DiscordIcon |
| `packages/ui/src/Form.test.tsx` | Form, FormField, FormGroup, FormActions |
| `packages/ui/src/PageWrapper.test.tsx` | PageWrapper, PageSection, PageGrid |

### Why They're Skipped

These tests appear to be well-written but are simply skipped with `describe.skip()`. They test:
- Component rendering
- Variant styles (primary, secondary, danger, discord)
- Size variants (sm, md, lg)
- Default prop behavior

There is no documented reason for skipping - this appears to be **technical debt** from initial test creation.

### Proposed Solution

**Option A: Enable and Fix (Recommended)**
1. Remove `describe.skip()` from all UI test files
2. Run tests: `npm run docker:test -- --testPathPattern=packages/ui`
3. Fix any failures (likely related to style comparisons)
4. Note: The style tests check exact RGB values which may need adjustment

**Option B: Skip Explicitly Until Fixed**
- Add a TODO comment explaining WHY they're skipped
- Create a tracking issue for enabling UI tests
- Add to technical debt backlog

Example comment to add:
```typescript
// TODO(#issue-number): Enable after fixing style comparison issues
// The tests check exact RGB values which differ between environments
describe('Button', () => {
```

---

## 3. Web Component Tests

These tests are for NextAuth integration components.

### Files Skipped

| File | Component |
|------|-----------|
| `apps/web/components/auth/SignOutButton.test.tsx` | SignOutButton |
| `apps/web/components/auth/SignInButton.test.tsx` | SignInButton |
| `apps/web/components/auth/SessionProvider.test.tsx` | SessionProvider |
| `apps/web/components/auth/UserMenu.test.tsx` | UserMenu |

### Why They're Skipped

These tests mock `next-auth/react` and test session-related functionality. The skip appears to be **precautionary** - they're testing React components that depend on NextAuth context, which can be tricky to set up in tests.

### Proposed Solution

**Option A: Enable with Proper Mocking**
1. Remove `describe.skip()` from each file
2. Ensure mocks properly handle NextAuth session context
3. Run tests: `npm run docker:test -- --testPathPattern=apps/web/components/auth`
4. Fix any issues with session context providers

**Option B: Convert to Integration Tests**
- Move these tests to E2E tests using Playwright
- Test actual authentication flows rather than mocking
- Aligns with modern Next.js testing recommendations

---

## 4. Web Page Tests

### Files Skipped

| File | Page |
|------|------|
| `apps/web/app/page.test.tsx` | Home Page |

### Why It's Skipped

The test is skipped with no explanation. Looking at the test:
- It renders the Home component
- Checks for heading "FightRise Tournament Bot"
- Checks for description text
- Validates page structure

This appears to be **technical debt** - the test should work if the page renders correctly.

### Proposed Solution

1. Remove `describe.skip('Home Page')`
2. Run the test: `npm run docker:test -- --testPathPattern=apps/web/app/page`
3. If it fails, check:
   - Page component exists and renders
   - Test library is properly configured
   - Any required providers are wrapped

---

## 5. Smoke Tests

Smoke tests are skipped when required credentials are not provided. This is **by design** - smoke tests run against real APIs and should only execute in controlled environments.

### Files Skipped

| File | Service | Skip Condition |
|------|---------|----------------|
| `apps/web/__tests__/smoke/oauth.smoke.spec.ts` | Discord OAuth | `!SMOKE_DISCORD_CLIENT_ID` |
| `apps/bot/src/__tests__/smoke/discord-api.smoke.test.ts` | Discord API | `!SMOKE_DISCORD_TOKEN` |
| `apps/bot/src/__tests__/smoke/redis.smoke.test.ts` | Redis | `!REDIS_URL` |
| `packages/database/src/__tests__/smoke/database.smoke.test.ts` | PostgreSQL | `!DATABASE_URL` |
| `packages/startgg-client/src/__tests__/smoke/startgg-api.smoke.test.ts` | Start.gg API | `!SMOKE_STARTGG_API_KEY` |

### Why They're Skipped

Smoke tests require **real credentials** for external services:
- Discord OAuth requires client ID/secret and redirect URI
- Discord API requires a bot token with specific permissions
- Redis requires a running Redis instance
- PostgreSQL requires a database connection
- Start.gg API requires an API key

These should **NOT** run in public CI to protect secrets. They're designed for:
- Pre-release validation in private CI
- Manual testing with test accounts
- Environment verification after deployment

### Proposed Solution

**Keep as-is (Recommended)**

These tests are correctly configured. To enable in your environment:

1. Create a `.env.smoke` file with test credentials:
   ```
   SMOKE_DISCORD_CLIENT_ID=...
   SMOKE_DISCORD_CLIENT_SECRET=...
   SMOKE_DISCORD_TOKEN=...
   SMOKE_STARTGG_API_KEY=...
   REDIS_URL=redis://localhost:6379
   DATABASE_URL=postgresql://...
   ```

2. Run smoke tests: `npm run docker:test:smoke`

3. Ensure credentials are rotated regularly and not shared

---

## 6. Bot Load Tests

### Files Skipped

| File | Test Suite |
|------|------------|
| `apps/bot/src/__tests__/load/pollingLoad.test.ts` | Acceptance Criteria Validation |
| `apps/bot/src/__tests__/load/pollingLoad.test.ts` | Performance Metrics |
| `apps/bot/src/__tests__/load/pollingLoad.test.ts` | Stress Testing |

### Why They're Skipped

The tests require **full infrastructure integration**:
- Running polling service with mock server
- Connected Redis instance for BullMQ
- Database for tournament data
- Mock Start.gg API server

The test file comments state:
```typescript
// Note: The following tests require a running polling service with the mock server connected.
// They are skipped in CI as they require full infrastructure integration.
```

### Proposed Solution

**Option A: CI Enhancement**
- Add a dedicated "load test" job in CI that spins up all required services
- Run only in specific branches (e.g., `main` on nightly schedule)
- Add `LOAD_TEST=true` environment variable to enable

**Option B: Local-Only Documentation**
- Document that load tests are **local-only** and require manual setup
- Keep them skipped in CI permanently
- Add clear instructions in README for local execution

**Option C: Continuous Load Testing**
- Deploy a staging environment with load testing enabled
- Run load tests on a schedule (nightly/weekly)
- Use results to track performance over time

---

## 7. Bot Unit Tests

### Files Skipped

| File | Test | Reason |
|------|------|--------|
| `apps/bot/src/services/__tests__/tournamentService.test.ts` | `should successfully create tournament when all validations pass` | Incomplete mock setup |
| `apps/bot/src/services/__tests__/tournamentService.test.ts` | `should mark as update when tournament already exists` | Incomplete mock setup |

### Why They're Skipped

According to the existing documentation:
- The `auditLog.create` mock was missing
- Transaction mock setup doesn't properly simulate the service's expected behavior
- These failures pre-date the integration testing PR

### Proposed Solution

1. Open `apps/bot/src/services/__tests__/tournamentService.test.ts`
2. Add the missing `auditLog.create` mock:
   ```typescript
   prisma.auditLog.create = vi.fn().mockResolvedValue({ id: 'audit-1' });
   ```
3. Ensure transaction mocking properly simulates the service behavior
4. Remove `it.skip()` and run tests

---

## 8. Start.gg Client Tests

### Files Skipped

| File | Test Suite |
|------|------------|
| `packages/startgg-client/src/client.test.ts` | Full test suite |

### Why It's Skipped

The test has this mock setup:
```typescript
vi.mock('graphql-request', () => ({
  GraphQLClient: vi.fn(() => ({
    request: vi.fn(),
  })),
  // ...
}));
```

The mock appears incomplete - it doesn't properly set up the client instance that the tests expect. The tests reference `mockedGraphQLClient.mock.results[0].value()` which may not work correctly with the current mock structure.

### Proposed Solution

**Option A: Fix Mock Setup**
1. Remove `describe.skip('StartGGClient')`
2. Fix the mock to properly return a request function:
   ```typescript
   vi.mock('graphql-request', () => {
     const mockRequest = vi.fn();
     return {
       GraphQLClient: vi.fn(() => ({
         request: mockRequest,
       })),
       ClientError: class ClientError extends Error {
         response: { status: number; errors?: Array<{ message: string }> };
         constructor(
           response: { status: number; errors?: Array<{ message: string }> },
           request: unknown
         ) {
           super('GraphQL Error');
           this.response = response;
         }
       },
       __mockRequest: mockRequest, // Export for tests
     };
   });
   ```

**Option B: Use MSW Instead**
- The codebase already has MSW handlers for Start.gg in `packages/startgg-client/src/__mocks__/`
- Refactor tests to use MSW instead of manual mocks
- More realistic HTTP mocking

---

## Summary and Recommendations

### Test Categories by Skip Reason

| Reason | Test Groups | Recommended Action |
|--------|-------------|-------------------|
| **Testcontainers/Docker unavailable** | Database Model Tests (11 files) | Configure CI with Docker or use docker-compose |
| **Technical debt** | UI Tests (5 files), Web Components (4 files), Page Tests (1 file) | Enable and fix any failures |
| **Pre-existing failures** | Bot Unit Tests (2 tests), Start.gg Client | Fix mock setup issues |
| **Missing credentials** | Smoke Tests (5 files) | Keep as-is, run manually |
| **Infrastructure requirements** | Load Tests (3 suites) | Configure dedicated CI job or document as local-only |

### Priority Actions

1. **High Priority** - Fix broken tests:
   - Bot unit tests (2 tests in tournamentService.test.ts)
   - Start.gg client tests

2. **Medium Priority** - Enable existing tests:
   - UI component tests (5 files)
   - Web component tests (4 files)
   - Home page test

3. **Low Priority** - Infrastructure work:
   - Database model tests (requires CI enhancement)
   - Load tests (requires dedicated environment)

### Testing Checklist

Before enabling any skipped tests:

- [ ] Run tests in Docker: `npm run docker:test`
- [ ] Check test output for specific failures
- [ ] Fix any issues before removing `.skip`
- [ ] Ensure lint passes: `npm run lint`
- [ ] Commit changes incrementally

---

## Appendix: Current Status

As of the last audit, here is the skip status:

| Category | Total Files | Skipped | Percentage |
|----------|-------------|---------|------------|
| Database Models | 11 | 11 | 100% |
| UI Components | 5 | 5 | 100% |
| Web Components | 4 | 4 | 100% |
| Web Pages | 1 | 1 | 100% |
| Smoke Tests | 5 | 5 | 100% |
| Load Tests | 1 | 1 | 100% |
| Bot Unit Tests | 1 | 1 (partial) | ~10% |
| Start.gg Client | 1 | 1 | 100% |

**Total: 29 test files with at least partial skipping**

---

*Document generated: 2026-03-02*
