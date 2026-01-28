---
status: pending
priority: p3
issue_id: "019"
tags: [code-review, refactor, quality, bot, pr-55]
dependencies: []
---

# Duplicate MatchStatus Building Pattern

## Problem Statement

The same MatchStatus object is built inline 6 times across `checkInPlayer()`, `reportScore()`, and `confirmResult()` with minor variations. This creates maintenance burden and potential drift.

## Findings

**Identified by**: code-simplicity-reviewer

**Location**: `/Users/sukritwalia/Documents/Projects/fightrise-bot/apps/bot/src/services/matchService.ts` (lines 443-458, 609-624, 669-684, 788-795, 805-821)

## Proposed Solutions

### Option A: Extract toMatchStatus() Helper (Recommended)

**Pros**: DRY, easier to maintain
**Cons**: Minor indirection
**Effort**: Small (30 min)
**Risk**: Low

```typescript
function toMatchStatus(
  match: MatchWithPlayers,
  stateOverride?: MatchState,
  playerOverrides?: Record<string, { isWinner?: boolean | null }>
): MatchStatus {
  return {
    id: match.id,
    identifier: match.identifier,
    roundText: match.roundText,
    state: stateOverride ?? match.state,
    discordThreadId: match.discordThreadId,
    checkInDeadline: match.checkInDeadline,
    players: match.players.map((p) => ({
      id: p.id,
      playerName: p.playerName,
      isCheckedIn: p.isCheckedIn,
      checkedInAt: p.checkedInAt,
      discordId: p.user?.discordId ?? null,
      isWinner: playerOverrides?.[p.id]?.isWinner ?? p.isWinner ?? null,
    })),
  };
}
```

## Recommended Action

Option A - Extract helper function.

## Technical Details

**Affected files**:
- `apps/bot/src/services/matchService.ts`

**Estimated LOC reduction**: ~65 lines

## Acceptance Criteria

- [ ] Helper function created
- [ ] All 6 inline constructions replaced
- [ ] Tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Identified during PR #55 code review | DRY for maintainability |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/55
