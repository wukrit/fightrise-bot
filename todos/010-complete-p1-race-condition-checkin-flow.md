---
status: pending
priority: p1
issue_id: "54"
tags: [code-review, security, race-condition, concurrency]
dependencies: []
---

# Race Condition (TOCTOU) in Check-in Flow

## Problem Statement

The check-in flow has a Time-of-Check to Time-of-Use (TOCTOU) vulnerability. Between checking if a player is already checked in and updating their status, another concurrent request could slip through, potentially causing both players to check in "simultaneously" and creating duplicate state transitions.

**Why it matters:** In a Discord bot, button clicks can happen rapidly. If both players click their check-in buttons at nearly the same time, both requests could pass the "is already checked in?" check before either updates the database.

## Findings

**Location:** `apps/bot/src/services/matchService.ts:319-430`

```typescript
// Time of CHECK
if (player.isCheckedIn) {
  return { success: false, message: 'You have already checked in!', bothCheckedIn: ... };
}

// ... other checks ...

// Time of USE - another request could have updated in between
await prisma.matchPlayer.update({
  where: { id: player.id },
  data: { isCheckedIn: true, checkedInAt: new Date() },
});

// Count checked-in players - could be wrong if concurrent updates
const checkedInCount = await prisma.matchPlayer.count({
  where: { matchId, isCheckedIn: true },
});
```

**Race scenario:**
1. Player 1 calls checkInPlayer(), passes validation (not checked in)
2. Player 2 calls checkInPlayer(), passes validation (not checked in)
3. Player 1's update executes
4. Player 2's update executes
5. Both see checkedInCount = 2
6. Both try to transition match to CHECKED_IN state

## Proposed Solutions

### Solution A: Use Prisma transactions with optimistic locking
- **Description:** Wrap the check-in logic in a transaction and use `updateMany` with a WHERE clause that includes the current state
- **Pros:** Prevents double-updates, database-enforced atomicity
- **Cons:** Slightly more complex code
- **Effort:** Medium
- **Risk:** Low

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Atomic update - only succeeds if not already checked in
  const updated = await tx.matchPlayer.updateMany({
    where: { id: player.id, isCheckedIn: false },
    data: { isCheckedIn: true, checkedInAt: new Date() },
  });

  if (updated.count === 0) {
    return { success: false, message: 'You have already checked in!' };
  }

  // Count within transaction
  const checkedInCount = await tx.matchPlayer.count({
    where: { matchId, isCheckedIn: true },
  });

  if (checkedInCount === 2) {
    // Use updateMany with state guard here too
    await tx.match.updateMany({
      where: { id: matchId, state: MatchState.CALLED },
      data: { state: MatchState.CHECKED_IN },
    });
  }

  return { success: true, bothCheckedIn: checkedInCount === 2 };
});
```

### Solution B: Use database unique constraint + upsert pattern
- **Description:** Add a unique constraint on (matchId, userId, checkedInAt IS NOT NULL) and use upsert
- **Pros:** Database-enforced uniqueness
- **Cons:** Schema change, more complex
- **Effort:** Large
- **Risk:** Medium

### Solution C: Accept current implementation for MVP
- **Description:** Keep current implementation, document the edge case
- **Pros:** No changes needed
- **Cons:** Race condition exists, could cause duplicate state transitions
- **Effort:** None
- **Risk:** Medium (though unlikely in practice)

## Recommended Action

**Solution A** - Use transactions with optimistic locking. This is the standard pattern for preventing race conditions in database operations.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/matchService.ts` - `checkInPlayer()` function

**Database Changes:**
- None required for Solution A

## Acceptance Criteria

- [ ] Check-in uses transaction for atomicity
- [ ] `updateMany` with state guard prevents double-updates
- [ ] Match state transition uses state guard (`state: CALLED`)
- [ ] Tests verify concurrent check-in handling
- [ ] No duplicate state transitions possible

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Created | Identified during code review of PR #54 |

## Resources

- PR #54: https://github.com/sukritwalia/fightrise-bot/pull/54
- Prisma transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions
- TOCTOU: https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use
