# Architecture Research: Testing Infrastructure

**Domain:** Test Architecture for Turborepo Monorepo (Discord Bot + Web Portal)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Standard Architecture

### System Overview

The FightRise project uses a multi-layered testing strategy with Vitest for unit/integration tests and Playwright for E2E tests. Tests run in Docker containers for consistency with CI/CD.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         E2E Test Layer (Playwright)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Auth Tests  │  │ Dashboard   │  │ Tournament  │  │ Match Tests │    │
│  │             │  │ Tests       │  │ Tests       │  │             │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                 │                 │                 │            │
├─────────┴─────────────────┴─────────────────┴─────────────────┴───────────┤
│                    Test Utilities Layer                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ Auth Mocks      │  │ Session Utils   │  │ Page Helpers            │    │
│  │ (NextAuth)      │  │ (JWT Cookies)   │  │                         │    │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘    │
├───────────┴─────────────────────┴────────────────────────┴──────────────────┤
│                  Integration Test Layer (Vitest)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ Discord Harness │  │ Testcontainers  │  │ MSW Handlers            │    │
│  │ (Mock Client)   │  │ (PostgreSQL)    │  │ (Start.gg API)          │    │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘    │
├───────────┴────────────────────┴────────────────────────┴──────────────────┤
│                      Unit Test Layer (Vitest)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ vi.mock         │  │ Transaction      │  │ Service Mocks           │    │
│  │ (Prisma/Discord)│  │ Mock Utility     │  │ (BullMQ/StartGG)       │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Docker Container Layer                              │
│         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│         │ Web Container│  │ Bot Container│  │ Infra        │            │
│         │ (Next.js)    │  │ (Node.js)    │  │ (PG + Redis) │            │
│         └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|---------------|----------|
| **DiscordTestClient** | In-memory mock of Discord.js client for command/button testing | `apps/bot/src/__tests__/harness/` |
| **MockInteraction** | Simulates Discord slash command and button interactions | `apps/bot/src/__tests__/harness/` |
| **Testcontainers** | Spins up isolated PostgreSQL for integration tests | `packages/database/src/__tests__/` |
| **MSW Handlers** | Intercepts HTTP requests to mock Start.gg GraphQL | `packages/startgg-client/src/__mocks__/` |
| **Playwright** | Browser automation for E2E web testing | `apps/web/__tests__/e2e/` |
| **Auth Mocks** | Mocks NextAuth session endpoints for E2E tests | `apps/web/__tests__/e2e/utils/auth.ts` |

## Test File Structure

### Existing Test Organization

```
apps/
├── bot/
│   └── src/
│       ├── __tests__/
│       │   ├── harness/           # Discord test client utilities
│       │   │   ├── DiscordTestClient.ts
│       │   │   ├── MockInteraction.ts
│       │   │   ├── MockChannel.ts
│       │   │   └── index.ts
│       │   ├── integration/       # Integration tests (with DB)
│       │   │   ├── checkin-flow.integration.test.ts
│       │   │   ├── match-threads.integration.test.ts
│       │   │   ├── score-reporting.integration.test.ts
│       │   │   └── ...
│       │   ├── services/          # Unit tests for services
│       │   │   ├── matchService.test.ts
│       │   │   ├── tournamentService.test.ts
│       │   │   └── registrationSyncService.test.ts
│       │   ├── smoke/             # Smoke tests (real APIs)
│       │   │   ├── discord-api.smoke.test.ts
│       │   │   └── redis.smoke.test.ts
│       │   └── load/              # Load testing scenarios
│       └── services/
│           └── __tests__/         # Colocated service tests
│
└── web/
    └── __tests__/
        ├── e2e/                   # Playwright E2E tests
        │   ├── auth.spec.ts
        │   ├── dashboard.spec.ts
        │   ├── tournaments.spec.ts
        │   ├── matches.spec.ts
        │   └── utils/
        │       └── auth.ts        # Auth mocking utilities
        └── smoke/                 # Web smoke tests
            └── oauth.smoke.spec.ts

packages/
├── database/
│   └── src/
│       └── __tests__/
│           ├── setup.ts           # Testcontainers setup
│           ├── smoke/             # DB smoke tests
│           └── utils/
│               └── seeders.ts    # Test data factories
│
└── startgg-client/
    └── src/
        ├── __mocks__/             # MSW handlers
        │   ├── handlers.ts
        │   ├── fixtures.ts
        │   └── server.ts
        └── __tests__/
            └── smoke/             # API smoke tests
```

### Recommended Structure for v2.0

New tests should follow existing patterns:

- **Unit tests**: Colocated in `__tests__` folder next to source, or in `services/__tests__/` for service layer
- **Integration tests**: In `__tests__/integration/` folder
- **E2E tests**: In `__tests__/e2e/` folder (Playwright)
- **Smoke tests**: In `__tests__/smoke/` folder (require real credentials)

## Testing Patterns

### Pattern 1: Discord Test Client (Bot Unit Tests)

**What:** In-memory mock of Discord.js client for testing slash commands without real Discord connection.

**When:** Testing bot commands and button handlers.

**Example:**
```typescript
// apps/bot/src/__tests__/harness/DiscordTestClient.ts
const client = createDiscordTestClient();

// Register the command
client.registerCommand(myCommand);

// Execute command
const interaction = await client.executeCommand('mycommand', {
  optionName: 'value',
});

// Assert
expect(interaction.lastReply?.content).toBe('Expected response');
```

### Pattern 2: vi.mock for External Dependencies

**What:** Mock modules before imports using Vitest's `vi.mock()`.

**When:** Testing services that depend on Prisma, Discord.js, or other external packages.

**Example:**
```typescript
// Mock database
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      const tx = { /* mock tx object */ };
      return callback(tx);
    }),
    MatchState: { /* enum values */ },
  },
}));

// Mock Discord client
vi.mock('discord.js', () => ({
  ChannelType: { GuildText: 0 },
  Client: vi.fn(),
}));
```

### Pattern 3: Transaction Mock Utility

**What:** Helper to mock Prisma `$transaction` behavior for testing state transitions.

**When:** Testing services that use transactions for atomic operations.

**Example:**
```typescript
import { setupTransactionMock } from '../../__tests__/utils/transactionMock.js';

const txClient = setupTransactionMock(prisma, {
  matchPlayer: {
    count: vi.fn().mockResolvedValue(1),
  },
});
```

### Pattern 4: Testcontainers for Integration Tests

**What:** Spins up isolated PostgreSQL container for each test run.

**When:** Integration tests that need real database operations.

**Example:**
```typescript
// packages/database/src/__tests__/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const container = await new PostgreSqlContainer('postgres:15-alpine')
  .withDatabase('fightrise_test')
  .withUsername('test')
  .withPassword('test')
  .start();

const databaseUrl = container.getConnectionUri();
```

### Pattern 5: MSW for API Mocking

**What:** Mock Service Worker intercepts HTTP requests to mock external APIs.

**When:** Testing code that calls Start.gg GraphQL API.

**Example:**
```typescript
// packages/startgg-client/src/__mocks__/handlers.ts
import { graphql, HttpResponse } from 'msw';

const startgg = graphql.link('https://api.start.gg/gql/alpha');

export const handlers = [
  startgg.query('GetTournament', () => {
    return HttpResponse.json({
      data: {
        tournament: { id: 'mock-id-12345', name: 'Weekly Tournament' },
      },
    });
  }),
];
```

### Pattern 6: Playwright E2E with Auth Mocks

**What:** Mock NextAuth session endpoints for testing authenticated flows without real OAuth.

**When:** Testing protected web pages and user flows.

**Example:**
```typescript
// apps/web/__tests__/e2e/utils/auth.ts
import { setupAuthenticatedState } from './utils/auth';

test('dashboard loads for authenticated user', async ({ page }) => {
  await setupAuthenticatedState(page);
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

### Pattern 7: Session Cookie for Middleware Auth

**What:** Set JWT cookie directly to authenticate for middleware-protected routes.

**When:** Testing routes protected by NextAuth middleware.

**Example:**
```typescript
// Generate valid JWT token for middleware
const session = createMockSession();
await setSessionCookie(page, session);
await mockAuthEndpoints(page, { session });
await page.goto('/protected-route'); // Middleware allows access
```

## Mocking Strategies by Dependency

### Database (Prisma)

| Test Type | Strategy | Implementation |
|-----------|----------|----------------|
| Unit | `vi.mock()` | Mock `prisma` object with `vi.fn()` |
| Integration | Testcontainers | Spin up PostgreSQL container |
| E2E | Real database | Docker compose provides shared DB |

**Key files:**
- Unit mock: `apps/bot/src/__tests__/utils/transactionMock.ts`
- Integration setup: `packages/database/src/__tests__/setup.ts`

### Discord API

| Test Type | Strategy | Implementation |
|-----------|----------|----------------|
| Unit | `DiscordTestClient` | In-memory mock of client, channels, threads |
| Integration | Real Discord (smoke) | `discord-api.smoke.test.ts` |
| E2E | N/A | Discord not involved in web tests |

**Key files:**
- Test client: `apps/bot/src/__tests__/harness/DiscordTestClient.ts`
- Channel mock: `apps/bot/src/__tests__/harness/MockChannel.ts`
- Interaction mock: `apps/bot/src/__tests__/harness/MockInteraction.ts`

### Start.gg API

| Test Type | Strategy | Implementation |
|-----------|----------|----------------|
| Unit | `vi.mock()` | Mock the StartGGClient class |
| Integration | MSW handlers | Intercept GraphQL requests |
| Smoke | Real API | `startgg-api.smoke.test.ts` |

**Key files:**
- MSW handlers: `packages/startgg-client/src/__mocks__/handlers.ts`
- Fixtures: `packages/startgg-client/src/__mocks__/fixtures.ts`

### NextAuth (Web)

| Test Type | Strategy | Implementation |
|-----------|----------|----------------|
| Unit | N/A | Auth tested in E2E |
| Integration | N/A | Auth tested in E2E |
| E2E | Mock endpoints + cookies | `apps/web/__tests__/e2e/utils/auth.ts` |

**Key files:**
- Auth utilities: `apps/web/__tests__/e2e/utils/auth.ts`
- Session mock: `createMockSession()`, `mockAuthSession()`

## Docker Test Infrastructure

### Test Scripts (from package.json)

```bash
# Unit tests
npm run docker:test                           # Run vitest in web container

# Integration tests
npm run docker:test:integration              # Run integration suite

# E2E tests
npm run docker:test:e2e                      # Run Playwright tests

# Smoke tests (require credentials)
npm run docker:test:smoke                     # All smoke tests
npm run docker:test:smoke:bot               # Bot smoke tests
npm run docker:test:smoke:startgg           # Start.gg API tests
```

### Docker Compose Services

| Service | Purpose | For Tests |
|---------|---------|-----------|
| `web` | Next.js app | Unit, integration, E2E |
| `bot` | Discord bot | Unit, integration, smoke |
| `postgres` | Database | Integration, E2E |
| `redis` | BullMQ queues | Integration |

### Test Configuration Files

| File | Purpose |
|------|---------|
| `apps/bot/vitest.config.ts` | Bot test config (exclude integration/smoke) |
| `apps/web/vitest.config.ts` | Web test config (jsdom environment) |
| `playwright.config.ts` | E2E test config with webServer |
| `packages/database/vitest.config.ts` | Database package tests |
| `packages/startgg-client/vitest.config.ts` | Start.gg client tests |

## Build Order for Tests

### Phase 1: Unit Test Foundation

1. **Build shared packages first** (required by apps)
   ```bash
   npm run build --filter=@fightrise/database
   npm run build --filter=@fightrise/shared
   npm run build --filter=@fightrise/startgg-client
   npm run build --filter=@fightrise/ui
   ```

2. **Run bot unit tests**
   ```bash
   npm run docker:test -- --filter=@fightrise/bot
   ```

3. **Run web unit tests**
   ```bash
   npm run docker:test -- --filter=@fightrise/web
   ```

### Phase 2: Integration Tests

1. **Ensure infra is running**
   ```bash
   npm run docker:infra        # Start Postgres and Redis
   npm run docker:db:push      # Push schema
   ```

2. **Run integration tests**
   ```bash
   npm run docker:test:integration
   ```

### Phase 3: E2E Tests

1. **Ensure full stack is running**
   ```bash
   npm run docker:dev          # Full stack with hot-reload
   ```

2. **Run E2E tests**
   ```bash
   npm run docker:test:e2e
   ```

### Phase 4: Smoke Tests (Optional, requires credentials)

```bash
npm run docker:test:smoke
```

## Test Isolation Strategies

| Resource | Isolation Method | Cleanup |
|----------|-----------------|---------|
| Database | Testcontainers per suite | `teardownTestDatabase()` |
| Discord state | `client.reset()` | Reset between tests |
| Auth state | Fresh page context | `page.context().clearCookies()` |
| MSW | Handlers reset | `server.resetHandlers()` |

## Anti-Patterns

### Anti-Pattern 1: Testing Implementation Details

**What:** Asserting on internal function calls rather than outcomes.

**Why:** Brittle tests that break on refactoring.

**Instead:** Test observable behavior (API responses, messages sent, DB state).

### Anti-Pattern 2: Shared Mutable State Between Tests

**What:** Using global variables or module-level state.

**Why:** Test order dependencies, flaky tests.

**Instead:** Use `beforeEach` to reset state, create fresh instances.

### Anti-Pattern 3: Skipping Tests "Temporarily"

**What:** Adding `.skip` or comments to skip tests.

**Why:** Technical debt, forgotten tests.

**Instead:** Delete or fix the test. Use `.todo` for planned tests.

### Anti-Pattern 4: Testing Without Assertions

**What:** Console.log debugging left in tests.

**Why:** No value, confuses future developers.

**Instead:** Write proper assertions, remove debug code.

### Anti-Pattern 5: Mocking Everything

**What:** Mocking all dependencies including simple utilities.

**Why:** Tests don't verify real behavior.

**Instead:** Mock at appropriate boundaries (DB, external APIs), test with real logic.

## Integration Points

### Test Infrastructure -> Application Code

| Integration | Boundary | How Tested |
|-------------|----------|------------|
| Bot -> Prisma | Service layer | Unit: vi.mock, Integration: Testcontainers |
| Bot -> Discord | Discord.js | Unit: DiscordTestClient, Smoke: Real API |
| Bot -> Start.gg | GraphQL client | Unit: vi.mock, Integration: MSW |
| Web -> Prisma | API routes | E2E: Playwright with real DB |
| Web -> NextAuth | Auth flow | E2E: Mocked session endpoints |
| Web -> Bot | Database | E2E: Both containers same DB |

### Test Containers Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Network                             │
│  ┌──────────────┐    DATABASE_URL    ┌──────────────┐         │
│  │ Web Container│ ◄────────────────► │ PostgreSQL   │         │
│  │ (Next.js)    │                    │              │         │
│  └──────────────┘                    └──────────────┘         │
│         │                                      ▲                 │
│         │ REDIS_URL                           │                 │
│         ▼                                      │                 │
│  ┌──────────────┐                             │                 │
│  │ Bot Container│ ─────────────────────────────┘                 │
│  │ (Node.js)    │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Scaling Considerations

| Scale | Test Strategy |
|-------|--------------|
| <100 tests | Run all in single suite |
| 100-500 tests | Split by package, parallel execution |
| 500+ tests | Split by type (unit/integration/e2e), CI pipeline |

### Performance Tips

1. **Unit tests first** - Fast, no external dependencies
2. **Mock external services** - Don't hit real APIs in CI
3. **Parallel execution** - Vitest runs in parallel by default
4. **E2E selectively** - Only critical user flows need browser tests

## Sources

- [Vitest Documentation](https://vitest.dev/) - Test runner configuration
- [Playwright Documentation](https://playwright.dev/) - E2E testing
- [Testcontainers](https://testcontainers.com/) - Database containers
- [MSW Documentation](https://mswjs.io/) - API mocking
- Existing codebase: `apps/bot/src/__tests__/harness/`, `packages/database/src/__tests__/setup.ts`

---

*Architecture research for: Testing Infrastructure*
*Researched: 2026-02-26*
