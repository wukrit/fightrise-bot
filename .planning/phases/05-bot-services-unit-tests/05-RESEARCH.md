# Phase 5: Bot Services Unit Tests - Research

**Researched:** 2026-02-26
**Domain:** Unit testing for Discord bot services and shared utilities
**Confidence:** HIGH

## Summary

Phase 5 focuses on adding unit tests for bot services (matchService, scoreHandler, checkinHandler, tournamentService, dqService, registrationSyncService, pollingService) and shared utilities. The project already has a solid test foundation using Vitest with Discord.js mocking infrastructure (DiscordTestClient). The main gaps are handler tests (scoreHandler, checkinHandler), dqService tests, and handler validation tests.

**Primary recommendation:** Prioritize critical user flows first (match flow -> check-in -> score reporting) and expand coverage using the existing DiscordTestClient harness pattern.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Database**: Real database using Testcontainers (spin up per test suite, reset data between tests)
- **Discord API**: Mocked using DiscordTestClient (fast, no network calls)
- **Start.gg API**: Mocked using MSW handlers
- **Test data**: Factory functions that create fresh data per test
- **Time-dependent code**: Use fake timers for deterministic behavior
- **Async operations**: Await all async operations

### Coverage Targets
- **Line coverage**: 90% minimum
- **Branch coverage**: All branches (not just lines)
- **Priority**: Critical user flows first (match flow, score reporting), then other services
- **Difficult-to-test code**: Document why uncovered code exists
- **CI enforcement**: Block CI if coverage drops below target
- **Scope**: New code must meet target, existing code is grandfathered

### Test Structure
- **Location**: `tests/` folder at package root
- **Naming**: `.test.ts` suffix (e.g., `matchService.test.ts`)
- **Organization**: By service (e.g., `tests/services/matchService.test.ts`)
- **Fixtures**: `tests/fixtures/` or `tests/__fixtures__/` folder
- **Setup**: Shared `setup.ts` runs before all tests
- **Describe blocks**: One per function/method being tested

### Test Scope
- **Happy + Error**: Test both successful and error cases
- **Edge cases**: Include null, undefined, empty, zero value tests
- **Happy paths**: Multiple scenarios per function, not just one

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANALYSIS-01 | Analyze existing test coverage and identify gaps vs requirements | Existing tests identified, gaps mapped |
| ANALYSIS-02 | Document existing test patterns and utilities for consistency | DiscordTestClient pattern documented below |
| ANALYSIS-03 | Identify test infrastructure improvements needed | Coverage gaps identified |
| BOT-01 | Unit tests for matchService.ts | EXISTS - comprehensive (matchService.test.ts) |
| BOT-02 | Unit tests for scoreHandler.ts | MISSING - needs new test file |
| BOT-03 | Unit tests for checkinHandler.ts | MISSING - needs new test file |
| BOT-04 | Unit tests for tournamentService.ts | EXISTS - partial (tournamentService.test.ts) |
| BOT-05 | Unit tests for dqService.ts | MISSING - needs new test file |
| BOT-06 | Unit tests for registrationSyncService.ts | EXISTS - partial (registrationSyncService.test.ts) |
| BOT-07 | Unit tests for pollingService.ts | EXISTS - in __tests__/services/ |
| SHR-01 | Unit tests for validation schemas | EXISTS (validation.test.ts) |
| SHR-02 | Unit tests for error classes | EXISTS (errors.test.ts) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | latest | Test runner with Vite | Fast, built-in mocking, TypeScript support |
| discord.js | v14 | Discord API | Official Discord library |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `vi.fn()` (Vitest) | Function mocking | Mocking database clients, external APIs |
| `vi.mock()` (Vitest) | Module mocking | Mocking @fightrise/database, @fightrise/shared |
| DiscordTestClient | Discord interaction testing | Testing slash commands, button handlers |
| Testcontainers | Database isolation | Integration tests requiring real database |

### Installation
```bash
npm install -D vitest
# Already in package.json as dev dependency
```

## Architecture Patterns

### Recommended Project Structure
```
apps/bot/src/
├── handlers/
│   ├── __tests__/
│   │   ├── scoreHandler.test.ts      # NEW
│   │   └── checkinHandler.test.ts    # NEW
│   ├── scoreHandler.ts
│   └── checkinHandler.ts
├── services/
│   ├── __tests__/
│   │   ├── matchService.test.ts       # EXISTS - comprehensive
│   │   ├── tournamentService.test.ts  # EXISTS - partial
│   │   ├── dqService.test.ts          # NEW
│   │   ├── pollingService.test.ts    # EXISTS
│   │   └── registrationSyncService.test.ts  # EXISTS - partial
│   ├── dqService.ts
│   └── ...
└── __tests__/
    ├── harness/
    │   ├── DiscordTestClient.ts       # EXISTS
    │   ├── MockInteraction.ts        # EXISTS
    │   └── MockChannel.ts            # EXISTS
    └── utils/
        └── transactionMock.ts        # EXISTS
```

### Pattern 1: DiscordTestClient for Handler Testing
**What:** In-memory Discord client mock for testing button/slash command interactions
**When to use:** Testing button handlers (scoreHandler, checkinHandler) and command execution
**Example:**
```typescript
// Source: apps/bot/src/__tests__/harness/DiscordTestClient.ts
import { createDiscordTestClient } from '../harness';

const client = createDiscordTestClient({ userId: 'user-123' });
client.registerCommand(myCommand);

// Execute command
const interaction = await client.executeCommand('mycommand', { option: 'value' });
expect(interaction.lastReply?.content).toBe('Expected response');

// Click button
const buttonInteraction = await client.clickButton('checkin:match123:1');
```

### Pattern 2: Prisma Transaction Mocking
**What:** Mock database transactions for service testing
**When to use:** Testing services that use prisma.$transaction
**Example:**
```typescript
// Source: apps/bot/src/__tests__/utils/transactionMock.ts
import { setupTransactionMock } from '../utils/transactionMock';

setupTransactionMock(prisma, {
  matchPlayer: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(1),
  },
  match: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
});
```

### Pattern 3: vi.mock for Module Dependencies
**What:** Mock entire modules (database, shared, external clients)
**When to use:** Testing any service with external dependencies
**Example:**
```typescript
// Source: apps/bot/src/services/__tests__/matchService.test.ts
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: { findUnique: vi.fn(), update: vi.fn() },
    // ...
  },
  MatchState: { NOT_STARTED: 'NOT_STARTED', ... },
}));
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord mocking | Custom mock classes | DiscordTestClient | Already implemented, handles interactions/threads |
| Prisma mocking | Manual jest mocks | vi.mock + transactionMock | Already implemented pattern |
| Time-dependent tests | Real timers | Vitest fake timers (vi.useFakeTimers) | Deterministic, fast |
| Async testing | Random timeouts | waitForEvent helper | Already in DiscordTestClient |

## Common Pitfalls

### Pitfall 1: Handler Interaction Response Not Tested
**What goes wrong:** Handler tests only test service functions, not Discord interaction responses
**Why it happens:** Services return data, handlers send Discord replies - different test approaches needed
**How to avoid:** Use DiscordTestClient.clickButton() to simulate button clicks and verify interaction.editReply() calls

### Pitfall 2: Missing Edge Case Coverage
**What goes wrong:** Tests only cover happy paths, miss null/undefined/invalid input
**Why it happens:** Focus on getting tests to pass, not on boundary conditions
**How to avoid:** Add describe blocks for each error condition from the service/handler code

### Pitfall 3: Test Data Not Isolated
**What goes wrong:** Tests share mock state between describe blocks
**Why it happens:** Not calling vi.clearAllMocks() or resetting client state
**How to avoid:** Use beforeEach/afterEach with proper reset calls

## Code Examples

### Testing scoreHandler with DiscordTestClient
```typescript
// New file: apps/bot/src/handlers/__tests__/scoreHandler.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscordTestClient } from '../../__tests__/harness';
import { scoreHandler } from '../scoreHandler';
import { INTERACTION_PREFIX } from '@fightrise/shared';

vi.mock('../matchService', () => ({
  reportScore: vi.fn(),
  confirmResult: vi.fn(),
}));

describe('scoreHandler', () => {
  let client: ReturnType<typeof createDiscordTestClient>;

  beforeEach(() => {
    client = createDiscordTestClient();
    vi.clearAllMocks();
  });

  it('should report score for valid button click', async () => {
    // Arrange: mock the service
    const { reportScore } = await import('../matchService');
    vi.mocked(reportScore).mockResolvedValue({
      success: true,
      message: 'Player1 wins',
      autoCompleted: true,
      matchStatus: { /* ... */ },
    });

    // Act: click the report button
    const interaction = await client.clickButton(
      `${INTERACTION_PREFIX.REPORT}:match123:1:quick`
    );

    // Assert
    expect(interaction.lastReply?.content).toBe('Player1 wins');
  });

  it('should reject invalid match ID format', async () => {
    const interaction = await client.clickButton(
      `${INTERACTION_PREFIX.REPORT}:invalid-id:1`
    );

    expect(interaction.lastReply?.content).toContain('Invalid match ID');
  });
});
```

### Testing checkinHandler with Button Click
```typescript
// New file: apps/bot/src/handlers/__tests__/checkinHandler.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscordTestClient } from '../../__tests__/harness';
import { checkinHandler } from '../checkin';
import { INTERACTION_PREFIX } from '@fightrise/shared';

vi.mock('../matchService', () => ({
  checkInPlayer: vi.fn(),
}));

describe('checkinHandler', () => {
  let client: ReturnType<typeof createDiscordTestClient>;

  beforeEach(() => {
    client = createDiscordTestClient();
    vi.clearAllMocks();
  });

  it('should successfully check in player', async () => {
    const { checkInPlayer } = await import('../matchService');
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in!',
      bothCheckedIn: false,
    });

    const interaction = await client.clickButton(
      `${INTERACTION_PREFIX.CHECK_IN}:match123:1`
    );

    expect(interaction.lastReply?.content).toBe('Checked in!');
  });

  it('should handle invalid player slot', async () => {
    const interaction = await client.clickButton(
      `${INTERACTION_PREFIX.CHECK_IN}:match123:99`
    );

    expect(interaction.lastReply?.content).toContain('Invalid player slot');
  });
});
```

## Existing Test Status

### Already Complete
| Service | Test File | Status |
|---------|-----------|--------|
| matchService | apps/bot/src/services/__tests__/matchService.test.ts | Comprehensive - 40+ tests |
| tournamentService | apps/bot/src/services/__tests__/tournamentService.test.ts | Partial - basic tests |
| registrationSyncService | apps/bot/src/services/__tests__/registrationSyncService.test.ts | Partial |
| pollingService | apps/bot/src/__tests__/services/pollingService.test.ts | Partial |
| validation | packages/shared/src/validation.test.ts | Complete |
| errors | packages/shared/src/errors.test.ts | Complete |
| datetime | packages/shared/src/datetime.test.ts | Complete |

### Needs New Tests
| Service | Suggested Test File | Priority |
|---------|---------------------|----------|
| scoreHandler | apps/bot/src/handlers/__tests__/scoreHandler.test.ts | HIGH |
| checkinHandler | apps/bot/src/handlers/__tests__/checkinHandler.test.ts | HIGH |
| dqService | apps/bot/src/services/__tests__/dqService.test.ts | MEDIUM |
| handlers/validation | apps/bot/src/handlers/__tests__/validation.test.ts | LOW |

## Open Questions

1. **Handler validation tests location**
   - What we know: validation.ts (isValidCuid) exists in handlers folder
   - What's unclear: Should tests go in handlers/__tests__/ or in shared package?
   - Recommendation: Create apps/bot/src/handlers/__tests__/validation.test.ts for consistency

2. **Coverage target enforcement**
   - What we know: Target is 90% line coverage
   - What's unclear: How will CI enforce this? Need to check package.json for coverage scripts
   - Recommendation: Add vitest coverage config to package.json if not present

3. **Handler test mocking strategy**
   - What we know: Services use prisma, handlers call services
   - What's unclear: Best way to mock services when testing handlers
   - Recommendation: Use vi.mock for service imports, test at handler level

## Sources

### Primary (HIGH confidence)
- Project source code: apps/bot/src/__tests__/harness/DiscordTestClient.ts
- Project test patterns: apps/bot/src/services/__tests__/matchService.test.ts
- Vitest documentation: https://vitest.dev/

### Secondary (MEDIUM confidence)
- discord.js button interaction patterns: https://discord.js.org/

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vitest already in use, DiscordTestClient implemented
- Architecture: HIGH - Test patterns already established in codebase
- Pitfalls: MEDIUM - Based on code analysis, some gaps remain

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (30 days for stable patterns)
