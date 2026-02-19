---
status: complete
priority: p1
issue_id: "071"
tags: [code-review, concurrency, database]
dependencies: []
---

# Race Condition in DQ API Route

## Problem Statement

The DQ API route uses a simple transaction without atomic state guards, unlike the bot's `dqService.ts` which properly uses `updateMany` with state guards. Two concurrent DQ requests could both succeed, causing data inconsistency.

**Why it matters:** Data integrity violation - match could be DQ'd twice.

## Findings

**Location:** `apps/web/app/api/matches/[id]/dq/route.ts` (lines 100-105)

Current code - no state guard:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.match.update({
    where: { id: matchId },
    data: { state: MatchState.DQ },
  });
```

Bot's dqService.ts (correct pattern) - lines 78-84:
```typescript
const updateMatchResult = await tx.match.updateMany({
  where: {
    id: matchId,
    state: { notIn: [MatchState.COMPLETED, MatchState.DQ] },
  },
  data: { state: MatchState.DQ },
});
if (updateMatchResult.count === 0) {
  throw new Error('Match has already been completed or DQd');
}
```

## Proposed Solutions

### Solution A: Add State Guard with updateMany (Recommended)
- **Description:** Use updateMany with state filter + count check
- **Pros:** Matches bot service pattern, atomic
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Solution A - Add state guard pattern.

## Technical Details

**Affected Files:**
- `apps/web/app/api/matches/[id]/dq/route.ts`

## Acceptance Criteria

- [x] DQ uses updateMany with state filter
- [x] Returns error if match already completed/DQ'd

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
- Bot dqService.ts for reference pattern
