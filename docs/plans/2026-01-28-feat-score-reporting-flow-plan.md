---
title: "feat: Implement Score Reporting Flow"
type: feat
date: 2026-01-28
issue: 12
---

# Implement Score Reporting Flow

## Overview

Allow players to report match results through Discord buttons after both players check in. Loser confirmations auto-submit immediately. Self-reported wins require opponent confirmation.

## Problem Statement

After players check in to a match, there is no way to report scores through Discord. This feature completes the match lifecycle.

## Proposed Solution

Follow the established check-in handler pattern:
1. Single `scoreHandler` that handles report/confirm/dispute button prefixes
2. Two service functions in `matchService.ts`: `reportScore()` and `confirmResult()`
3. Use existing `MatchPlayer.isWinner` field - no schema changes needed

## Technical Approach

### Flow

```
Player clicks "Player B Won" button
  ├─ If reporter is Player B (self-report) → PENDING_CONFIRMATION, show confirm buttons
  └─ If reporter is Player A (loser confirms) → COMPLETED, sync to Start.gg
```

### State Transitions

| Current State | Action | By | Result |
|---------------|--------|-----|--------|
| CHECKED_IN | report:1 | player1 | PENDING_CONFIRMATION (self-report) |
| CHECKED_IN | report:1 | player2 | COMPLETED (loser confirmed) |
| PENDING_CONFIRMATION | confirm | opponent | COMPLETED |
| PENDING_CONFIRMATION | dispute | opponent | Post message, keep waiting |

### Button Custom ID Format

Following check-in pattern (`checkin:{matchId}:{slot}`):

| Button | Custom ID Format | Example |
|--------|------------------|---------|
| Report Winner | `report:{matchId}:{winnerSlot}` | `report:abc123:1` |
| Confirm Result | `confirm:{matchId}` | `confirm:abc123` |
| Dispute Result | `dispute:{matchId}` | `dispute:abc123` |

### Key Design Decisions

1. **No schema changes** - Use existing `MatchPlayer.isWinner` field
2. **No timeout system** - Matches wait until resolved; TOs can intervene manually
3. **No admin notification system** - TOs can watch match threads
4. **Single handler file** - Routes based on button prefix
5. **Trust Discord auto-archive** - No custom archival logic

## Implementation Phases

### Phase 1: Core Report Flow

**Goal**: Players can report scores. Loser confirmations auto-submit to Start.gg.

**Files to modify:**
- `apps/bot/src/services/matchService.ts` - Add `reportScore()` function
- `apps/bot/src/handlers/scoreHandler.ts` (new) - Button handler for report/confirm/dispute
- `apps/bot/src/handlers/index.ts` - Register score handler

**Tasks:**
- [x] Implement `reportScore(matchId, discordUserId, winnerSlot)` in matchService
  - Validate user is match participant
  - Validate match state is CHECKED_IN
  - Determine if self-report or loser-confirmation
  - If loser confirms: set `isWinner`, transition to COMPLETED, sync to Start.gg
  - If self-report: set `isWinner`, transition to PENDING_CONFIRMATION
  - Return result with matchStatus for UI update
- [x] Create `scoreHandler` following check-in pattern
  - Parse button prefix (report/confirm/dispute)
  - Delegate to service functions
  - Update embed based on result
- [x] Register handler in index.ts
- [x] Update check-in handler to show report buttons after both check in (already done)

### Phase 2: Confirmation Flow

**Goal**: Opponent can confirm or dispute self-reported wins.

**Files to modify:**
- `apps/bot/src/services/matchService.ts` - Add `confirmResult()` function
- `apps/bot/src/handlers/scoreHandler.ts` - Add confirm/dispute handling

**Tasks:**
- [x] Implement `confirmResult(matchId, discordUserId, confirmed: boolean)` in matchService
  - Validate user is the opponent (not the reporter)
  - Validate match state is PENDING_CONFIRMATION
  - If confirmed: transition to COMPLETED, sync to Start.gg
  - If disputed: post message in thread, keep PENDING_CONFIRMATION state
  - Return result for UI update
- [x] Add confirm/dispute button handling to scoreHandler
- [x] Create embed templates for each state:
  - PENDING_CONFIRMATION: "Player X reported winning. Waiting for Player Y to confirm."
  - COMPLETED: "Match Complete! Winner: Player X"
- [x] Show confirm/dispute buttons to opponent after self-report

## Acceptance Criteria

- [ ] After check-in, match embed shows "Player 1 Won" and "Player 2 Won" buttons
- [ ] Clicking opponent's name (loser confirms) immediately completes the match
- [ ] Clicking own name (self-report) shows pending confirmation state
- [ ] Opponent sees Confirm and Dispute buttons after self-report
- [ ] Confirming completes the match and syncs to Start.gg
- [ ] Disputing posts a message and keeps match in pending state
- [ ] Non-participants get ephemeral error when clicking buttons
- [ ] Double-clicks are handled idempotently

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Both players click same winner | First click wins, second is idempotent |
| Player not in match clicks | Ephemeral "You are not in this match" |
| Match already completed | Ephemeral "This match has already been completed" |
| Start.gg sync fails | Log error, match still marked complete locally |
| Reporter clicks confirm | Ephemeral "You cannot confirm your own report" |

## Testing Plan

### Unit Tests
- `matchService.reportScore()` - loser confirm path
- `matchService.reportScore()` - self-report path
- `matchService.reportScore()` - validation errors
- `matchService.confirmResult()` - confirm path
- `matchService.confirmResult()` - dispute path
- State guard validation (concurrent clicks)

### Integration Tests
- Score handler with mock Discord interaction
- Full flow: check-in → report → confirm
- Concurrent button clicks

## References

### Internal Files
- Check-in handler pattern: `apps/bot/src/handlers/checkin.ts`
- Button handler registry: `apps/bot/src/handlers/buttonHandlers.ts`
- Match service: `apps/bot/src/services/matchService.ts`
- Start.gg client: `packages/startgg-client/src/index.ts`

### Documented Learnings
- `docs/solutions/concurrency-issues/discord-button-race-conditions.md`
- `docs/solutions/discord-patterns/automatic-match-thread-creation.md`
