---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, testing]
dependencies: []
---

# Missing Unit Test Coverage for Poll Logic

## Problem Statement

The current test file only covers `calculatePollInterval()` and constants. The core polling logic (`pollTournament`, `syncEventMatches`, `processSet`) lacks unit test coverage.

**Why it matters:** Critical business logic for match creation/update is untested, making it risky to refactor or modify.

## Findings

**Location:** `apps/bot/src/__tests__/services/pollingService.test.ts`

Current tests (39 lines):
- `calculatePollInterval` - covered
- `STARTGG_SET_STATE` constants - covered

Missing tests:
- `processSet()` match creation logic
- `processSet()` match completion logic
- `syncEventMatches()` pagination handling
- Error handling paths (AuthError, P2002)
- Race condition handling

**Evidence from Kieran TypeScript Reviewer:**
- Identified as moderate issue
- Recommendation: Add integration tests with mocked dependencies

## Proposed Solutions

### Solution 1: Mock-based Unit Tests (Recommended)

Add tests using vi.mock for Prisma and StartGGClient.

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@fightrise/database';

vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('processSet', () => {
  it('creates match when set is ready and no existing match', async () => {
    prisma.match.findUnique.mockResolvedValue(null);
    prisma.match.create.mockResolvedValue({ id: '1' });

    // ... test implementation
  });
});
```

| Aspect | Assessment |
|--------|------------|
| Pros | Fast, isolated, deterministic |
| Cons | Mocks can drift from reality |
| Effort | Medium |
| Risk | Low |

### Solution 2: Integration Tests with Testcontainers

Use the existing Testcontainers setup for real database tests.

| Aspect | Assessment |
|--------|------------|
| Pros | Tests real database behavior |
| Cons | Slower, more setup |
| Effort | Medium-Large |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/__tests__/services/pollingService.test.ts`

**Test scenarios to add:**
1. Match creation when set is READY state
2. Match creation skipped when players not assigned
3. Match update when set COMPLETED
4. Race condition handling (P2002 error)
5. AuthError propagation
6. Pagination through multiple pages of sets

## Acceptance Criteria

- [ ] Test coverage for processSet() match creation
- [ ] Test coverage for processSet() match update
- [ ] Test coverage for error handling paths
- [ ] All tests pass with `npm run test`

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Kieran noted missing test coverage |

## Resources

- Existing test patterns in `apps/bot/src/__tests__/`
- PR #52
