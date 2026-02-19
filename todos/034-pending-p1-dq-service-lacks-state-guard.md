---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, database, concurrency, bot]
dependencies: []
---

# DQ Service Lacks Optimistic Locking

## Problem Statement

Unlike matchService.ts which correctly uses updateMany with a state guard, the DQ service uses plain update inside a transaction without checking the current state atomically. A concurrent operation could change the state between read and write, allowing a COMPLETED match to be regressed to DQ state.

**Why it matters:** Match states could be corrupted, allowing completed matches to be reverted.

## Findings

**Location:** `apps/bot/src/services/dqService.ts:75-78`

```typescript
await prisma.$transaction(async (tx) => {
  // Update match state -- NO state guard
  await tx.match.update({
    where: { id: matchId },
    data: { state: MatchState.DQ },
  });
```

## Proposed Solutions

### Solution A: Use updateMany with state guard
- **Description:** Use updateMany with state guard to ensure match hasn't transitioned
- **Pros:** Prevents race conditions
- **Cons:** Slightly more complex
- **Effort:** Small
- **Risk:** Low

```typescript
const updated = await tx.match.updateMany({
  where: {
    id: matchId,
    state: { notIn: [MatchState.COMPLETED, MatchState.DQ] },
  },
  data: { state: MatchState.DQ },
});
if (updated.count === 0) {
  return { success: false, message: 'Match state changed concurrently.' };
}
```

## Recommended Action

**Solution A** - Use updateMany with state guard.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/dqService.ts`

## Acceptance Criteria

- [x] DQ uses guard
- [x] Concurrent DQ attempts handled gracefully

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Completed | Added updateMany with state guard and error handling |

## Resources

- Review: Database Layer
