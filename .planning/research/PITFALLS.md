# Domain Pitfalls

**Project:** FightRise - Testing Enhancements (v2.0)
**Researched:** 2026-02-26
**Focus:** Common mistakes when adding test coverage to existing Node.js/TypeScript monorepo with Discord bot and Next.js web app

## Critical Pitfalls

Mistakes that cause rewrites or major issues when adding test coverage to existing projects.

### Pitfall 1: Testing Implementation Instead of Behavior

**What goes wrong:** Tests break whenever implementation details change, even though the behavior remains correct. Tests become a maintenance burden rather than a safety net.

**Why it happens:**
- Mocking internal dependencies instead of testing through public interfaces
- Asserting on specific method calls rather than outcomes
- Testing implementation details like "did we call prisma.user.findUnique?" instead of "did we get the user?"

**Consequences:**
- Tests must be rewritten for every refactor
- False negatives: passing code fails tests due to harmless refactoring
- Developer frustration leads to skipping or deleting tests

**Prevention:**
- Test through public interfaces (commands, API routes, service public methods)
- Assert on side effects: database state, messages sent, API responses
- Use behavior-driven assertions: `expect(result.userId).toBe(expected)` not `expect(prisma.user.findUnique).toHaveBeenCalledWith(...)`

**Detection:** When refactoring code breaks more than 5% of tests, this is the problem.

### Pitfall 2: Inadequate Test Isolation

**What goes wrong:** Tests affect each other through shared state in isolation but fails. A test passes in the suite, or vice versa.

**Why it happens:**
- Using real database without cleanup between tests
- Global mutable state (singleton services, cached data)
- Not resetting mocks between tests
- Shared Discord test client instance across tests

**Consequences:**
- Flaky tests that pass/fail non-deterministically
- "Works on my machine" issues in CI
- Tests must run in specific order

**Prevention:**
- Use the existing `setupTestDatabase()` and `clearTestDatabase()` utilities in `packages/database/src/__tests__/setup.ts`
- Call `vi.clearAllMocks()` and `vi.restoreAllMocks()` in `beforeEach`/`afterEach`
- Use unique Discord user IDs per test: `createDiscordTestClient({ userId: 'unique-user-${testIndex}' })`
- Create fresh service instances per test

**Existing Infrastructure (use these):**
```typescript
// Database - use existing setup
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from '@fightrise/database';

// Discord - reset between tests
testClient.reset(); // Clear messages, threads, interactions

// Mocks - clear in beforeEach
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());
```

### Pitfall 3: Over-Mocking External Dependencies

**What goes wrong:** Tests pass but the code doesn't work with real dependencies. Integration tests fail at runtime.

**Why it happens:**
- Mocking everything: Prisma, Discord.js, Start.gg client
- Not having integration tests that use real infrastructure
- Mocks returning simplified data that doesn't match real API responses

**Consequences:**
- Unit tests pass, integration tests fail
- Production bugs discovered in deployment
- False confidence from high coverage numbers

**Prevention:**
- Have a mix of unit tests (mocked) and integration tests (real dependencies)
- Use Testcontainers for PostgreSQL (already set up in `packages/database/src/__tests__/setup.ts`)
- Use the MSW handlers for Start.gg GraphQL that match real API structure
- Run smoke tests against real APIs: `npm run docker:test:smoke`

**Detection:** If all tests can run without Docker/Postgres/Redis, you're over-mocking.

---

## Moderate Pitfalls

### Pitfall 4: Not Testing Error Paths and Edge Cases

**What goes wrong:** Tests only cover the happy path. Production fails on errors that were never tested.

**Why it happens:**
- Writing tests only for main functionality
- Ignoring error handling code paths
- Not testing null/undefined edge cases

**Consequences:**
- Unhandled exceptions in production
- Poor error messages for users
- Silent failures that are hard to debug

**Prevention:**
- Use existing test patterns from `apps/bot/src/services/__tests__/`:
  ```typescript
  it('should return USER_NOT_LINKED error if user has no Start.gg account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const result = await service.setupTournament(mockSetupParams);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('USER_NOT_LINKED');
    }
  });
  ```
- Test: null values, empty arrays, network errors, rate limits, permission denied

### Pitfall 5: Testing Async Code Without Proper Waiting

**What goes wrong:** Tests pass locally but fail in CI due to race conditions. Promises resolve after the test completes.

**Why it happens:**
- Not awaiting async operations
- Using `.then()` instead of `async/await`
- Not waiting for Discord message sends to complete
- BullMQ jobs executing after test assertion

**Consequences:**
- Flaky tests in CI
- Intermittent failures that are hard to reproduce
- Tests that work locally but fail in Docker

**Prevention:**
- Always `await` async operations
- Use the existing `waitForEvent()` helper from `DiscordTestClient`:
  ```typescript
  const thread = await waitForEvent<MockThreadChannel>(testClient, 'threadCreated');
  ```
- For BullMQ: wait for job completion or use job test utilities
- Use `vi.useFakeTimers()` for time-dependent code when appropriate

### Pitfall 6: Ignoring Database Transaction Boundaries

**What goes wrong:** Tests don't account for Prisma `$transaction()` calls. Mock doesn't match production behavior.

**Why it happens:**
- Mocking Prisma methods individually without considering transactions
- Not testing that operations actually happen within a transaction
- Transaction failures not simulated

**Consequences:**
- Tests pass but real code fails with transaction errors
- Partial commits in production not caught in tests
- Rollback scenarios not tested

**Prevention:**
- Use the existing `createMockTransaction()` utility from `apps/bot/src/__tests__/utils/transactionMock.ts`:
  ```typescript
  const txClient = createMockTransaction({
    tournament: { findUnique: vi.fn(), upsert: vi.fn() }
  });
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(txClient));
  ```
- Test transaction success and failure cases

---

## Minor Pitfalls

### Pitfall 7: Hardcoded Test IDs and Data

**What goes wrong:** Tests use hardcoded IDs that might conflict with real data or future tests.

**Why it happens:**
- Copy-pasting test code without changing IDs
- Using "123" or "test-user" everywhere

**Consequences:**
- ID collisions in tests
- Confusing test output
- Tests that accidentally pass due to matching data

**Prevention:**
- Use factory functions: `createTestUser({ id: \`user-${uuid()}\` })`
- Use the existing seeders in `packages/database/src/__tests__/utils/seeders.ts`
- For Discord: use unique IDs per test context

### Pitfall 8: Not Testing Discord Permission and Rate Limit Scenarios

**What goes wrong:** Tests assume Discord API always succeeds. Production fails when rate limited or permissions missing.

**Why it happens:**
- Mocked Discord client always succeeds
- Not testing what happens when bot lacks permissions
- Not testing rate limit handling

**Consequences:**
- Bot fails silently in production
- Rate limits cause cascading failures
- Missing permissions not detected until production

**Prevention:**
- Add tests for Discord API failures:
  ```typescript
  mockChannel.send.mockRejectedValue(new Error('Missing Permissions'));
  await expect(command.execute(interaction)).rejects.toThrow('Missing Permissions');
  ```
- Test rate limit error handling
- Test missing permission scenarios

### Pitfall 9: E2E Tests Not Accounting for Network Variability

**What goes wrong:** E2E tests pass in fast CI but fail on slow connections. Timeouts are too tight.

**Why it happens:**
- Hardcoded timeouts too short for CI
- Not waiting for network idle
- Page loads assumed instantaneous

**Consequences:**
- Flaky E- CI failures that don't reflect real issues2E tests

- Tests that require multiple retries to pass

**Prevention:**
- Use Playwright's auto-waiting: `await page.click('button')` waits for element
- Use `waitForURL()` instead of checking URL immediately
- Set reasonable timeouts in `playwright.config.ts`
- Use `networkidle` for critical navigations:
  ```typescript
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  ```

### Pitfall 10: Missing Test Coverage for Prisma Schema Changes

**What goes wrong:** Tests use old Prisma client, breaking when schema changes.

**Why it happens:**
- Not regenerating Prisma client after schema changes
- Tests use stale types
- Type errors in tests after schema migration

**Consequences:**
- Tests fail to compile after schema changes
- Type safety lost
- Runtime errors from schema/client mismatch

**Prevention:**
- Always run `npm run db:generate` after schema changes
- Run tests in Docker where schema is pushed fresh: `npm run docker:db:push`
- Add schema change tests that verify model relationships work

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Unit tests for bot commands | Testing implementation not behavior | Assert on messages sent, not internal calls |
| Unit tests for services | Not testing error paths | Add error case tests alongside happy path |
| Integration tests for database | Not clearing state between tests | Use `clearTestDatabase()` in beforeEach |
| Integration tests for Start.gg | Mocks don't match real API | Use MSW handlers from packages/startgg-client |
| E2E tests for web portal | Not mocking auth properly | Use auth utils from e2e/utils |
| E2E tests for Discord flows | Race conditions in async code | Use `waitForEvent()` for thread/message creation |

---

## Domain-Specific Pitfalls

### Discord Bot Pitfalls

| Pitfall | Why Bad | Prevention |
|---------|---------|------------|
| Not mocking Discord events properly | Tests fail without real Discord | Use DiscordTestClient harness |
| Testing button handlers in isolation | Ignores event routing | Test through button click: `testClient.clickButton()` |
| Not testing permission checks | Security vulnerability | Test with non-admin users |
| Ignoring thread archival | Matches stay open in production | Test thread state transitions |

### Next.js Web Pitfalls

| Pitfall | Why Bad | Prevention |
|---------|---------|------------|
| Testing server components without setup | Environment variables missing | Use Docker test environment |
| Not mocking NextAuth session | Auth tests fail | Use auth utilities from e2e/utils |
| Testing API routes without request context | Headers missing | Use supertest or Playwright |
| Ignoring middleware | Protected routes bypassed | Test both authenticated and unauthenticated |

### Prisma Database Pitfalls

| Pitfall | Why Bad | Prevention |
|---------|---------|------------|
| Not respecting foreign keys | Tests pass, production fails | Clear tables in order (see existing setup) |
| Testing without transactions | Race conditions in tests | Use `createMockTransaction()` |
| Not testing cascade deletes | Orphaned data in production | Test delete flows with relations |

### GraphQL/Start.gg Pitfalls

| Pitfall | Why Bad | Prevention |
|---------|---------|------------|
| Mocks don't match GraphQL schema | Tests pass, real API fails | Use existing MSW handlers |
| Not testing rate limit handling | Production hangs | Mock rate limit errors |
| Not testing OAuth token refresh | Auth fails silently | Test token refresh flow |

---

## Sources

- Vitest Documentation (https://vitest.dev/) - Test runner used in project
- Playwright Best Practices (https://playwright.dev/docs/best-practices) - E2E testing
- discord.js Testing Guide (https://discordjs.guide/testing/) - Bot testing patterns
- Prisma Testing Best Practices (https://www.prisma.io/docs/guides/testing) - Database testing
- Mock Service Worker (MSW) (https://mswjs.io/) - API mocking used for Start.gg
