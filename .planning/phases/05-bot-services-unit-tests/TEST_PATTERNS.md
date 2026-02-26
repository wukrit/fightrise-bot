# Test Patterns - FightRise Bot

## Overview

This document captures the established test patterns used in the FightRise bot project for consistency across all unit tests.

## Test Structure

### Location
- Unit tests are in `__tests__/` folders within service/handler directories
- Naming convention: `*.test.ts` suffix
- Example: `apps/bot/src/services/__tests__/matchService.test.ts`

### Test Setup
- Shared setup in `beforeEach` with `vi.clearAllMocks()`
- Each test file is self-contained with its own mocks
- Use descriptive test names following the pattern: `should [expected behavior] when [condition]`

### Running Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test -- --coverage
```

## DiscordTestClient Pattern

Use for testing button handlers and slash commands:

```typescript
import { createDiscordTestClient } from '../../__tests__/harness';

const client = createDiscordTestClient({ userId: 'user-123' });
const interaction = await client.clickButton('checkin:match123:1');
expect(interaction.lastReply?.content).toBe('Expected response');
```

## vi.mock Pattern

Mock external dependencies:

```typescript
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  MatchState: {
    NOT_STARTED: 'NOT_STARTED',
    CALLED: 'CALLED',
    CHECKED_IN: 'CHECKED_IN',
  },
}));
```

## Prisma Transaction Mock

Use for services using transactions:

```typescript
vi.mock('@fightrise/database', () => {
  const mockPrisma = {
    match: { /* ... */ },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };
  return { prisma: mockPrisma };
});
```

## Mocking Discord.js

```typescript
vi.mock('discord.js', () => ({
  ChannelType: { GUILD_TEXT: 0 },
  ThreadChannel: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
    setArchived: vi.fn().mockResolvedValue({}),
  })),
}));
```

## Test Scope

### Happy Paths
- Test successful scenarios
- Multiple scenarios per function, not just one

### Error Paths
- Test failure modes
- Test error handling

### Edge Cases
- null, undefined, empty, invalid input
- Race conditions (e.g., concurrent check-ins)
- Idempotency scenarios

## Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchService } from '../matchService';

vi.mock('@fightrise/database', () => ({
  prisma: { /* mock */ },
}));

describe('MatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMatchThread', () => {
    it('should create thread for valid match', async () => {
      const result = await matchService.createMatchThread('match-123');
      expect(result).toBeDefined();
    });

    it('should return null when match not found', async () => {
      const result = await matchService.createMatchThread('nonexistent');
      expect(result).toBeNull();
    });
  });
});
```

## Current Test Coverage

| Service/Handler | Test File | Tests | Status |
|-----------------|-----------|-------|--------|
| matchService | services/__tests__/matchService.test.ts | 47 | Good |
| tournamentService | services/__tests__/tournamentService.test.ts | 22 | Good |
| registrationSyncService | services/__tests__/registrationSyncService.test.ts | 12 | Good |
| pollingService | __tests__/services/pollingService.test.ts | 23 | Good |
| dqService | services/__tests__/dqService.test.ts | 10 | Good |
| checkinHandler | handlers/__tests__/checkinHandler.test.ts | 5 | Partial |
| scoreHandler | handlers/__tests__/scoreHandler.test.ts | 4 | Partial |
| validation | handlers/__tests__/validation.test.ts | 19 | Good |

## Best Practices

1. **Mock at the boundary**: Mock external services (Discord, Prisma, Start.gg)
2. **Test one thing per test**: Each test should verify a single behavior
3. **Use descriptive names**: `should return X when Y` pattern
4. **Reset mocks**: Always call `vi.clearAllMocks()` in beforeEach
5. **Assert on interactions**: Check that mocks were called with correct arguments
6. **Test error handling**: Don't just test happy paths

---

*Documented: 2026-02-26*
*Phase: 05-bot-services-unit-tests*
