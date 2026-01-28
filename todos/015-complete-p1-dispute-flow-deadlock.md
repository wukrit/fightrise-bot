---
status: complete
priority: p1
issue_id: "015"
tags: [code-review, security, state-machine, bot, pr-55]
dependencies: []
---

# Dispute Flow State Machine Deadlock

## Problem Statement

When a player disputes a self-reported result, the match becomes stuck in an unusable state. The UI shows report buttons but clicking them fails because the state is still `PENDING_CONFIRMATION`.

**Impact**: Matches that are disputed become permanently stuck, requiring manual database intervention.

## Findings

**Identified by**: kieran-rails-reviewer, security-sentinel, architecture-strategist

**Location**:
- `/Users/sukritwalia/Documents/Projects/fightrise-bot/apps/bot/src/services/matchService.ts` (lines 798-822)
- `/Users/sukritwalia/Documents/Projects/fightrise-bot/apps/bot/src/handlers/scoreHandler.ts` (lines 147-164)

**Evidence**:

When `confirmResult()` is called with `confirmed=false` (dispute):
1. Function returns `success: true` but does NOT change the match state
2. `isWinner` flag on the self-reporter remains `true`
3. Handler rebuilds report buttons (lines 152-156 in scoreHandler.ts)
4. But `reportScore()` blocks when state is `PENDING_CONFIRMATION` (line 550-552)

```typescript
// matchService.ts - Dispute path does NOT reset state
} else {
  console.log(`[ConfirmResult] Disputed: ...`);
  return {
    success: true,
    matchStatus: {
      state: MatchState.PENDING_CONFIRMATION,  // Still pending!
      players: match.players.map((p) => ({
        isWinner: p.isWinner,  // NOT cleared
      })),
    },
  };
}
```

```typescript
// reportScore() will fail if called after dispute
if (match.state === MatchState.PENDING_CONFIRMATION) {
  return { success: false, message: 'A result has already been reported...' };
}
```

## Proposed Solutions

### Option A: Reset State to CHECKED_IN (Recommended)

**Pros**: Simple, allows re-reporting, matches existing flow
**Cons**: None significant
**Effort**: Small (30 min)
**Risk**: Low

Reset state and clear winner flags when disputed:

```typescript
} else {
  // Dispute: reset to CHECKED_IN so players can re-report
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.match.updateMany({
      where: { id: matchId, state: MatchState.PENDING_CONFIRMATION },
      data: { state: MatchState.CHECKED_IN },
    });

    if (updated.count === 0) {
      return { success: false, reason: 'STATE_CHANGED' };
    }

    // Clear winner flags on all players
    await tx.matchPlayer.updateMany({
      where: { matchId },
      data: { isWinner: null },
    });

    return { success: true };
  });

  if (!result.success) {
    return { success: false, message: 'Match state changed. Please try again.' };
  }

  return {
    success: true,
    message: 'Result disputed. Please report the correct winner.',
    matchStatus: {
      state: MatchState.CHECKED_IN,  // Reset state
      players: match.players.map((p) => ({
        isWinner: null,  // Clear winner flags
      })),
    },
  };
}
```

### Option B: Use DISPUTED State

**Pros**: More explicit state tracking, could enable admin resolution flow
**Cons**: Requires new state handling, more complex
**Effort**: Medium (2 hours)
**Risk**: Medium - adds complexity

Transition to `DISPUTED` state (already defined in schema) and add new `resolveDispute()` function.

## Recommended Action

Option A - Reset state to CHECKED_IN. This is the simplest fix that aligns with the existing UI behavior (showing report buttons after dispute).

## Technical Details

**Affected files**:
- `apps/bot/src/services/matchService.ts`
- `apps/bot/src/services/__tests__/matchService.test.ts` (add test)

**Database changes**: None required

## Acceptance Criteria

- [x] When a result is disputed, match state transitions back to `CHECKED_IN`
- [x] When a result is disputed, all `isWinner` flags are cleared to `null`
- [x] After dispute, players can click report buttons and successfully report a new result
- [x] Unit test covers the re-report-after-dispute flow

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Identified during PR #55 code review | State machine must handle all edge cases |
| 2026-01-28 | Fixed: Reset state to CHECKED_IN and clear isWinner flags | Transaction ensures atomic state reset |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/55
- Issue: #12
