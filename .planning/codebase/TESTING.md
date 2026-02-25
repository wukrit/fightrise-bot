# Testing Patterns

**Analysis Date:** 2026-02-25

## Test Framework

**Runner:**
- Vitest v1.x for unit, integration, and smoke tests
- Playwright for E2E tests

**Configuration Files:**
- `/home/ubuntu/fightrise-bot/apps/bot/vitest.config.ts` - Unit tests
- `/home/ubuntu/fightrise-bot/apps/bot/vitest.integration.config.ts` - Integration tests
- `/home/ubuntu/fightrise-bot/apps/bot/vitest.smoke.config.ts` - Smoke tests
- `/home/ubuntu/fightrise-bot/apps/bot/vitest.e2e.config.ts` - E2E tests
- Web app uses similar vitest configs in `apps/web/vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest)
- Playwright built-in `expect`

**Run Commands:**
```bash
# Unit tests (all packages)
npm run docker:test           # Run in Docker for consistency
npm run test                 # Run locally

# Integration tests (bot)
npm run docker:test:integration
npm run test:integration    # Bot integration tests

# E2E tests (web)
npm run docker:test:e2e      # Run Playwright E2E tests

# Smoke tests
npm run docker:test:smoke    # All smoke tests
npm run docker:test:smoke:bot  # Bot smoke tests only

# Watch mode (local development)
npm run test:watch           # Bot unit tests watch mode
```

**Test Discovery:**
- Unit tests: `src/**/*.test.ts`
- Integration tests: `src/__tests__/integration/**/*.test.ts`
- E2E tests: `src/__tests__/e2e/**/*.test.ts`
- Smoke tests: `src/__tests__/smoke/**/*.test.ts`

## Test File Organization

**Location:**
- Unit tests: Co-located with source files (e.g., `matchService.ts` has `matchService.test.ts` in same directory)
- Integration tests: `src/__tests__/integration/`
- E2E tests: `src/__tests__/e2e/` (web app)
- Smoke tests: `src/__tests__/smoke/`
- Test utilities: `src/__tests__/utils/`, `src/__tests__/harness/`

**Naming:**
- Unit tests: `<moduleName>.test.ts`
- Integration tests: `<feature>-flow.integration.test.ts` (e.g., `checkin-flow.integration.test.ts`)
- E2E tests: `<feature>.spec.ts`

**Structure:**
```
apps/bot/src/
├── services/
│   ├── matchService.ts
│   └── __tests__/
│       └── matchService.test.ts        # Unit tests (older pattern)
├── __tests__/
│   ├── integration/
│   │   ├── checkin-flow.integration.test.ts
│   │   ├── match-threads.integration.test.ts
│   │   └── score-reporting.integration.test.ts
│   ├── smoke/
│   │   ├── redis.smoke.test.ts
│   │   └── discord-api.smoke.test.ts
│   ├── harness/
│   │   ├── DiscordTestClient.ts
│   │   ├── MockInteraction.ts
│   │   └── MockChannel.ts
│   └── utils/
│       └── transactionMock.ts
```

## Test Structure

**Unit Test Pattern (Vitest):**
```typescript
// From /home/ubuntu/fightrise-bot/packages/shared/src/validation.test.ts
import { describe, it, expect } from 'vitest';
import { isValidTournamentSlug, validateTournamentSlug } from './validation.js';

describe('validation', () => {
  describe('isValidTournamentSlug', () => {
    it('should return true for valid slugs', () => {
      expect(isValidTournamentSlug('my-tournament')).toBe(true);
    });

    it('should return false for invalid slugs', () => {
      expect(isValidTournamentSlug('')).toBe(false);
    });
  });
});
```

**Integration Test Pattern:**
```typescript
// From /home/ubuntu/fightrise-bot/apps/bot/src/__tests__/integration/checkin-flow.integration.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DiscordTestClient } from '../../harness/DiscordTestClient.js';

describe('Check-in Flow', () => {
  let testClient: DiscordTestClient;

  beforeEach(() => {
    testClient = new DiscordTestClient({ userId: 'user-123' });
  });

  it('should check in player successfully', async () => {
    const interaction = await testClient.executeCommand('checkin');
    expect(interaction.lastReply?.content).toContain('Checked in');
  });
});
```

## Mocking

**Framework:** Vitest `vi.fn()` for all mocking

**Database Mocking:**
Use `setupTransactionMock()` from `/home/ubuntu/fightrise-bot/apps/bot/src/__tests__/utils/transactionMock.ts`:

```typescript
import { setupTransactionMock } from '../../__tests__/utils/transactionMock.js';

it('should check in player successfully', async () => {
  // Setup mock with custom behavior
  const txClient = setupTransactionMock(prisma, {
    matchPlayer: {
      count: vi.fn().mockResolvedValue(1),
    },
  });

  const result = await checkInPlayer('match-123', 'discord-111');
  expect(result.success).toBe(true);
});
```

**Discord Client Mocking:**
Use `DiscordTestClient` harness from `/home/ubuntu/fightrise-bot/apps/bot/src/__tests__/harness/DiscordTestClient.ts`:

```typescript
const testClient = new DiscordTestClient({
  userId: 'user-123',
  username: 'TestUser',
  guildId: 'guild-123',
});

// Execute slash commands
const interaction = await testClient.executeCommand('checkin', {});

// Execute button interactions
const buttonInteraction = await testClient.executeButton('checkin:match-123:player-1');
```

**Package Mocks:**
Use `vi.mock()` before imports:

```typescript
// Mock the database before imports
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      const tx = { /* mock tx client */ };
      return callback(tx);
    }),
  },
  MatchState: { NOT_STARTED: 'NOT_STARTED', CALLED: 'CALLED' },
}));

// Then import the module under test
import { createMatchThread } from '../matchService.js';
```

**What to Mock:**
- External APIs: Discord.js, Start.gg API
- Database: Prisma client
- Time-dependent logic: Use `vi.useFakeTimers()` for time-based tests
- Environment variables: Mock with `vi.stubEnv()`

**What NOT to Mock:**
- Internal utility functions being tested
- Pure functions in the same module

## Fixtures and Factories

**Test Data Location:**
- Inline in test files for simple cases
- `/home/ubuntu/fightrise-bot/apps/bot/src/__tests__/load/utils/tournamentFactory.ts` for complex scenarios

**Factory Pattern Example:**
```typescript
// From /home/ubuntu/fightrise-bot/apps/bot/src/__tests__/load/utils/tournamentFactory.ts
export function createMockTournament(overrides?: Partial<Tournament>): Tournament {
  return {
    id: 'tournament-1',
    slug: 'test-tournament',
    name: 'Test Tournament',
    state: TournamentState.REGISTRATION_OPEN,
    discordGuildId: 'guild-123',
    discordChannelId: 'channel-123',
    ...overrides,
  };
}
```

## Coverage

**Requirements:** None explicitly enforced

**View Coverage:**
```bash
# Run tests with coverage
npm run test -- --coverage

# Coverage reports generated in:
# apps/bot/coverage/
# packages/shared/coverage/
```

**Coverage Configuration (from vitest.config.ts):**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  reportsDirectory: 'coverage',
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/**/*.d.ts'],
}
```

## Test Types

**Unit Tests:**
- Test single functions or methods in isolation
- Use mocks for external dependencies
- Focus on business logic: validation, transformations, edge cases
- Example: `packages/shared/src/validation.test.ts`

**Integration Tests:**
- Test multiple components working together
- Use DiscordTestClient for bot command flows
- Use Testcontainers for database operations
- Run sequentially to avoid database conflicts (`pool: 'forks'` with `singleFork: true`)
- 30 second timeout for database operations

**E2E Tests (Playwright):**
- Test complete user flows in browser
- Use mocked authentication via `setupAuthenticatedState()` and `mockUnauthenticatedState()`
- Example: `apps/web/__tests__/e2e/auth.spec.ts`

**Smoke Tests:**
- Run against real external services (Discord API, Start.gg API, Redis)
- Require actual credentials in environment
- Tagged appropriately to run separately from unit tests

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
it('should throw error for invalid input', async () => {
  await expect(() => validateInput({})).rejects.toThrow('Missing required field');
});
```

**Mocking Async Functions:**
```typescript
vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch);
vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 });
```

**Testing with Time:**
```typescript
it('should handle deadline passed', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-28T12:00:00Z'));

  const result = await checkInPlayer('match-123', 'discord-111');

  vi.useRealTimers();
  expect(result.success).toBe(false);
});
```

**Testing Discord Interactions:**
```typescript
const interaction = await testClient.executeCommand('checkin');
expect(interaction.lastReply?.content).toContain('Checked in');

// Button clicks
const buttonInteraction = await testClient.executeButton('checkin:match-123:player-1');
```

---

*Testing analysis: 2026-02-25*
