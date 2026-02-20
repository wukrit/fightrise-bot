---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, concurrency, database, web]
dependencies: []
---

# Race Condition in Score Reporting

## Problem Statement

The score reporting logic performs multiple sequential database operations without a transaction. Two players reporting simultaneously can create inconsistent match states.

**Why it matters:** Match results could be corrupted or lost due to concurrent score reports.

## Findings

**Location:** `apps/web/app/api/matches/[id]/report/route.ts:77-117`

```typescript
// Update the match player's reported score
await prisma.matchPlayer.update({ ... });

// Check if opponent has reported - but opponent could report BETWEEN these calls!
const opponentPlayer = match.players.find((p) => p.userId !== user.id);

if (opponentPlayer?.reportedScore !== null ...) {
  // Then update match state
  await prisma.match.update({ ... });
}
```

## Proposed Solutions

### Solution A: Use Prisma transaction
- **Description:** Wrap score reporting in prisma.$transaction
- **Pros:** Atomic operations, prevents race conditions
- **Cons:** Slightly more complex
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Use prisma.$transaction for atomicity.

## Technical Details

**Affected Files:**
- `apps/web/app/api/matches/[id]/report/route.ts`

## Acceptance Criteria

- [x] Score reporting uses transaction
- [x] Concurrent reports handled correctly
- [x] Tests verify race condition handling

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Fixed | Wrapped in prisma.$transaction |

## Resources

- Review: Web Portal Domain
