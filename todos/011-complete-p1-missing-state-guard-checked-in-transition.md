---
status: pending
priority: p1
issue_id: "54"
tags: [code-review, concurrency, state-machine]
dependencies: ["010"]
---

# Missing State Guard on CHECKED_IN Transition

## Problem Statement

When transitioning the match from CALLED to CHECKED_IN state after both players check in, the code uses `match.update()` instead of `match.updateMany()` with a state guard. This means if two concurrent requests both detect `checkedInCount === 2`, both will attempt to update the match state.

**Why it matters:** Without a state guard, the match state could be updated multiple times, potentially causing issues with downstream logic or incorrect state transitions.

## Findings

**Location:** `apps/bot/src/services/matchService.ts:406-410`

```typescript
if (bothCheckedIn) {
  // No state guard - vulnerable to concurrent updates
  await prisma.match.update({
    where: { id: matchId },
    data: { state: MatchState.CHECKED_IN },
  });
}
```

**Compare to thread creation** which correctly uses state guard:
```typescript
// apps/bot/src/services/matchService.ts:108-115
const updateResult = await prisma.match.updateMany({
  where: { id: matchId, state: MatchState.NOT_STARTED },  // State guard ✓
  data: { discordThreadId: thread.id, state: MatchState.CALLED, checkInDeadline },
});
```

## Proposed Solutions

### Solution A: Use updateMany with state guard
- **Description:** Replace `update` with `updateMany` that includes current state in WHERE clause
- **Pros:** Prevents duplicate state transitions, consistent with existing pattern
- **Cons:** Slightly more verbose
- **Effort:** Small
- **Risk:** Very Low

```typescript
if (bothCheckedIn) {
  const updated = await prisma.match.updateMany({
    where: { id: matchId, state: MatchState.CALLED },
    data: { state: MatchState.CHECKED_IN },
  });

  // Log if state was already changed (concurrent request won)
  if (updated.count === 0) {
    console.log(`[CheckIn] Match ${matchId} state already transitioned`);
  }
}
```

### Solution B: Combine with race condition fix (Todo #010)
- **Description:** Fix this as part of the transaction-based solution for race conditions
- **Pros:** Single cohesive fix for all concurrency issues
- **Cons:** Depends on #010 being implemented
- **Effort:** Part of #010
- **Risk:** Low

## Recommended Action

**Solution B** - Implement as part of the transaction fix in Todo #010. This keeps all concurrency fixes together.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/matchService.ts` - `checkInPlayer()` function

**Dependency:**
- This should be fixed as part of Todo #010 (race condition fix)

## Acceptance Criteria

- [ ] Match state transition uses `updateMany` with state guard
- [ ] Only transitions from CALLED to CHECKED_IN
- [ ] Logs when concurrent request already transitioned state
- [ ] Tests verify state guard behavior

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Created | Identified during code review of PR #54 |

## Resources

- PR #54: https://github.com/sukritwalia/fightrise-bot/pull/54
- Related: Todo #010 (race condition fix)
