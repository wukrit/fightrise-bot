---
title: "Score Reporting Flow for Discord Match Threads"
category: feature-implementation
tags:
  - discord-bot
  - score-reporting
  - match-management
  - state-machine
  - startgg-integration
  - button-interactions
  - optimistic-locking
module: bot
symptoms:
  - "Players need to report match scores after check-in"
  - "Winner/loser confirmation required before finalizing results"
  - "Self-reported wins need opponent verification"
  - "Score disputes must allow re-reporting without deadlock"
  - "Match results need to sync back to Start.gg tournament bracket"
date: 2026-01-28
---

# Score Reporting Flow for Discord Match Threads

## Problem Statement

After both players check in to a tournament match, they need a mechanism to report match results through Discord buttons. The flow must handle:
- Loser confirmation (trusted, auto-completes)
- Winner self-report (requires opponent confirmation)
- Disputes (allows re-reporting)
- Syncing results to Start.gg

## Solution Overview

### State Machine

```
NOT_STARTED → CALLED → CHECKED_IN → PENDING_CONFIRMATION → COMPLETED
                                ↑__________________________|
                                (dispute resets to CHECKED_IN)
```

### Core Flow

1. **Score Buttons Appear**: After both players check in, match shows "Player 1 Won" / "Player 2 Won" buttons
2. **Loser Confirmation Path**: If a player reports opponent won, match auto-completes (trusted)
3. **Winner Self-Report Path**: If a player reports themselves as winner, opponent must confirm
4. **Dispute Handling**: Either player can dispute, resetting state for fresh reporting
5. **Start.gg Sync**: Completed matches sync to tournament bracket via GraphQL

## Implementation

### Key Files

| File | Purpose |
|------|---------|
| `apps/bot/src/services/matchService.ts` | Service layer: `reportScore`, `confirmResult`, `syncToStartGG`, `toMatchStatus` |
| `apps/bot/src/handlers/scoreHandler.ts` | Discord button handlers: scoreHandler, confirmHandler, disputeHandler |
| `packages/database/prisma/schema.prisma` | `MatchState` and `StartggSyncStatus` enums |

### Service Layer

#### reportScore Function

```typescript
export async function reportScore(
  matchId: string,
  discordId: string,
  winnerSlot: number  // 1 or 2
): Promise<ReportResult> {
  // Validate state is CHECKED_IN
  // Find reporter by Discord ID
  // Determine if self-report or loser confirmation

  if (isSelfReport) {
    // Transition: CHECKED_IN → PENDING_CONFIRMATION
    // Set isWinner=true on claimed winner
    return { autoCompleted: false, message: 'Waiting for opponent to confirm' };
  } else {
    // Loser confirmation: CHECKED_IN → COMPLETED
    // Set isWinner flags on both players
    // Fire-and-forget sync to Start.gg
    return { autoCompleted: true, message: 'Match complete!' };
  }
}
```

#### confirmResult Function

```typescript
export async function confirmResult(
  matchId: string,
  discordId: string,
  confirmed: boolean
): Promise<ConfirmResult> {
  // Validate state is PENDING_CONFIRMATION
  // Only opponent (non-reporter) can confirm/dispute

  if (confirmed) {
    // Transition: PENDING_CONFIRMATION → COMPLETED
    // Sync to Start.gg
  } else {
    // CRITICAL: Reset BOTH state AND winner flags
    await prisma.$transaction(async (tx) => {
      await tx.match.updateMany({
        where: { id: matchId, state: MatchState.PENDING_CONFIRMATION },
        data: { state: MatchState.CHECKED_IN },
      });
      await tx.matchPlayer.updateMany({
        where: { matchId },
        data: { isWinner: null },  // Clear ALL winner flags
      });
    });
  }
}
```

### Handler Layer

```typescript
// CUID validation at handler boundary
const CUID_REGEX = /^c[a-z0-9]{24}$/;

export const scoreHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.REPORT,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    const [matchId, winnerSlotStr] = parts;

    // Validate format before any async work
    if (!CUID_REGEX.test(matchId)) {
      await interaction.reply({ content: 'Invalid button.', ephemeral: true });
      return;
    }

    // Defer IMMEDIATELY to avoid 3-second timeout
    await interaction.deferReply({ ephemeral: true });

    const result = await reportScore(matchId, interaction.user.id, winnerSlot);
    await interaction.editReply({ content: result.message });

    // Update embed based on result...
  },
};
```

### Key Patterns

#### 1. Optimistic Locking with State Guards

```typescript
const updated = await tx.match.updateMany({
  where: { id: matchId, state: MatchState.CHECKED_IN },  // State guard
  data: { state: MatchState.PENDING_CONFIRMATION },
});

if (updated.count === 0) {
  return { success: false, message: 'Match state changed. Please try again.' };
}
```

#### 2. Discord Defer Pattern

```typescript
// Sync validation → Defer → Async work → EditReply
if (!CUID_REGEX.test(matchId)) {
  await interaction.reply({ content: 'Invalid', ephemeral: true });
  return;
}
await interaction.deferReply({ ephemeral: true });
const result = await doWork();
await interaction.editReply({ content: result.message });
```

#### 3. Sync Status Tracking

```prisma
enum StartggSyncStatus {
  NOT_SYNCED
  PENDING
  SYNCED
  FAILED
}

model Match {
  startggSyncStatus StartggSyncStatus @default(NOT_SYNCED)
  startggSyncError  String?
}
```

#### 4. DRY Helper with Overrides

```typescript
function toMatchStatus(
  match: MatchWithPlayers,
  overrides?: {
    state?: MatchState;
    playerWinnerMap?: Record<string, boolean | null>;
  }
): MatchStatus {
  return {
    id: match.id,
    state: overrides?.state ?? match.state,
    players: match.players.map((p) => ({
      ...p,
      isWinner: overrides?.playerWinnerMap?.[p.id] ?? p.isWinner ?? null,
    })),
  };
}
```

## Issues Found During Code Review

| Priority | Issue | Root Cause | Fix |
|----------|-------|------------|-----|
| P1 | Dispute flow deadlock | State stayed PENDING_CONFIRMATION, isWinner not cleared | Reset state to CHECKED_IN AND clear all isWinner flags |
| P2 | Discord timeout | DB ops before reply could exceed 3s | deferReply immediately after sync validation |
| P2 | Input validation gap | matchId passed directly to DB | Add CUID_REGEX validation at handler boundary |
| P2 | Sync durability | Fire-and-forget with no tracking | Add StartggSyncStatus enum + error field |
| P3 | Code duplication | MatchStatus built inline 6 times | Extract toMatchStatus() helper |

## Prevention Strategies

### State Machine Safety
- Document all state transitions before implementing
- For every "revert" action, list ALL fields that need resetting
- Add test: action → revert → action succeeds

### Discord Handler Pattern
- Only sync validation before `deferReply()`
- All async work after defer
- Always use `editReply()` for responses

### External Sync Reliability
- Use enum for status (not boolean)
- Store error message for debugging
- Consider BullMQ queue for automatic retries

### Input Validation
- Validate ALL user input at handler boundary
- Return early before deferring on invalid input
- Use shared validation utilities

## Testing

Tests in `apps/bot/src/services/__tests__/matchService.test.ts`:

- Auto-complete when loser confirms opponent won
- Pending confirmation when winner self-reports
- Error handling for invalid states
- Concurrent request handling (optimistic locking)
- Dispute resets state to CHECKED_IN
- Re-reporting after dispute succeeds

## Related Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/55
- Issue: #12
- Discord.js deferred replies: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
