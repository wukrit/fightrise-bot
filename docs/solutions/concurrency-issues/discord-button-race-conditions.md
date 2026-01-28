---
title: "Discord Check-In Button Race Conditions and Performance Issues"
category: concurrency
module: apps/bot/src/services/matchService.ts
tags:
  - discord-bot
  - race-condition
  - toctou
  - database-optimization
  - prisma
  - transactions
  - optimistic-locking
  - state-machine
symptoms:
  - "Duplicate check-in possible when two players click simultaneously"
  - "Match state could transition to CHECKED_IN multiple times"
  - "N+1 query pattern in check-in flow"
  - "Slow MatchPlayer queries on matchId foreign key"
date_resolved: 2026-01-28
issue_number: 11
pr_number: 54
related_commits:
  - 42f8529  # P1 fixes
  - 21b5644  # P2 fixes
  - 7f5072f  # P3 documentation
---

# Discord Check-In Button Race Conditions and Performance Issues

## Problem Summary

When implementing check-in button interactions for Discord match threads, several concurrency and performance issues were identified during code review:

1. **Race Condition (TOCTOU)**: Concurrent button clicks could bypass check-in validation
2. **Missing State Guard**: Match state transitions lacked atomicity protection
3. **Duplicate Database Query**: Handler queried match data twice unnecessarily
4. **Missing Index**: No index on `MatchPlayer.matchId` for count queries

## Root Cause

The original implementation followed a naive "check then update" pattern:

```typescript
// DANGEROUS: Race condition prone
if (player.isCheckedIn) {
  return "Already checked in";
}
// Gap where concurrent request can slip through
await prisma.matchPlayer.update({ ... });
```

In Discord bots, button clicks can happen simultaneously when both players click at nearly the same time. The time gap between checking state and updating it (Time-of-Check to Time-of-Use) allows race conditions.

## Solution

### 1. Transaction with Optimistic Locking

Wrap the entire check-in flow in a Prisma transaction and use `updateMany` with state guards:

**File:** `apps/bot/src/services/matchService.ts:391-427`

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Atomic update - only succeeds if player is not already checked in
  const updated = await tx.matchPlayer.updateMany({
    where: { id: player.id, isCheckedIn: false },  // State guard
    data: { isCheckedIn: true, checkedInAt: new Date() },
  });

  // If no rows updated, player was already checked in (concurrent request)
  if (updated.count === 0) {
    return { success: false, bothCheckedIn: false, alreadyCheckedIn: true };
  }

  // Count checked-in players within the transaction
  const checkedInCount = await tx.matchPlayer.count({
    where: { matchId, isCheckedIn: true },
  });

  const bothCheckedIn = checkedInCount === 2;

  if (bothCheckedIn) {
    // Use updateMany with state guard to prevent duplicate transitions
    await tx.match.updateMany({
      where: { id: matchId, state: MatchState.CALLED },  // State guard
      data: { state: MatchState.CHECKED_IN },
    });
  }

  return { success: true, bothCheckedIn, alreadyCheckedIn: false };
});
```

### 2. Return Data from Mutations

Extend the result interface to include match status, eliminating the need for a second query:

**File:** `apps/bot/src/services/matchService.ts:252-258`

```typescript
export interface CheckInResult {
  success: boolean;
  message: string;
  bothCheckedIn: boolean;
  /** Match status included on successful check-in to avoid duplicate DB queries */
  matchStatus?: MatchStatus;
}
```

The handler now uses `result.matchStatus` directly instead of calling `getMatchStatus()`.

### 3. Add Database Index

**File:** `packages/database/prisma/schema.prisma`

```prisma
model MatchPlayer {
  // ... fields ...

  @@unique([matchId, startggEntrantId])
  @@index([userId])
  @@index([matchId])  // Added for count queries
}
```

## Prevention Guidelines

### Always Use State Guards with `updateMany`

```typescript
// SAFE: Only transitions from valid state
const updated = await prisma.match.updateMany({
  where: { id: matchId, state: 'CALLED' },  // State guard
  data: { state: 'CHECKED_IN' },
});

if (updated.count === 0) {
  // State already transitioned by concurrent request
}
```

### Wrap Multi-Step Operations in Transactions

```typescript
const result = await prisma.$transaction(async (tx) => {
  // All operations use tx, not prisma
  const updated = await tx.matchPlayer.updateMany({ ... });
  const count = await tx.matchPlayer.count({ ... });
  await tx.match.updateMany({ ... });
  return result;
});
```

### Return Data from Mutations Instead of Separate Queries

```typescript
// Before: Two queries
const result = await checkInPlayer(matchId, discordId);
const match = await getMatchStatus(matchId);  // Redundant

// After: Single query, data in result
const result = await checkInPlayer(matchId, discordId);
const match = result.matchStatus;  // Already included
```

### Test Concurrent Requests

```typescript
it('should only allow one check-in when clicked simultaneously', async () => {
  const promises = Array(5).fill(null).map(() =>
    checkInPlayer(matchId, playerId)
  );
  const results = await Promise.all(promises);

  const successes = results.filter(r => r.success);
  expect(successes).toHaveLength(1);  // Exactly one succeeds
});
```

## Key Patterns Applied

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Optimistic Locking | Prevent concurrent updates | `updateMany` with state in WHERE |
| Transaction Boundaries | Ensure atomicity | `prisma.$transaction()` |
| Return Enriched Results | Avoid duplicate queries | Include `matchStatus` in result |
| Index Foreign Keys | Query performance | `@@index([matchId])` |

## Related Documentation

### Internal
- [Start.gg Polling Service](./startgg-polling-service-implementation.md) - Similar Prisma patterns
- [Match Thread Creation Plan](../plans/2026-01-28-feat-match-thread-creation-plan.md) - State guard examples

### Code Examples
- `apps/bot/src/services/matchService.ts:391-427` - Transaction with optimistic locking
- `apps/bot/src/services/matchService.ts:108-115` - State guard pattern for thread creation

### Related Issues/PRs
- Issue #11: Check-in button interactions
- PR #54: Implementation with fixes

### External
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [TOCTOU (Wikipedia)](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use)

## Checklist for Future Button Handlers

- [ ] Identify all state that could be modified concurrently
- [ ] Use `updateMany` with state guards for atomic transitions
- [ ] Wrap multi-table updates in transactions
- [ ] Return needed data from mutations instead of separate queries
- [ ] Add indexes for columns used in WHERE clauses
- [ ] Write concurrent test cases
