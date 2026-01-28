---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, performance, discord, bot, pr-55]
dependencies: []
---

# Discord 3-Second Deadline Risk

## Problem Statement

The score handlers perform database operations BEFORE replying to Discord interactions. Under load, this can exceed Discord's 3-second deadline, causing "This interaction failed" errors.

## Findings

**Identified by**: performance-oracle

**Location**: `/Users/sukritwalia/Documents/Projects/fightrise-bot/apps/bot/src/handlers/scoreHandler.ts` (lines 42-48)

**Evidence**:

```typescript
// Database operation BEFORE reply
const result = await reportScore(matchId, interaction.user.id, winnerSlot);

// Reply comes AFTER database operations
await interaction.reply({
  content: result.message,
  ephemeral: true,
});
```

**Impact at scale**:
- 10 concurrent reports: ~5% failure rate
- 100 concurrent reports: ~30% timeout risk

## Proposed Solutions

### Option A: Defer Reply Immediately (Recommended)

**Pros**: Gets 15 minutes instead of 3 seconds, simple change
**Cons**: Slightly different UX (shows "thinking..." briefly)
**Effort**: Small (15 min)
**Risk**: Low

```typescript
async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
  // Defer IMMEDIATELY to get 15 minutes
  await interaction.deferReply({ ephemeral: true });

  // ... validation and processing ...

  const result = await reportScore(matchId, interaction.user.id, winnerSlot);

  // Use editReply for deferred interactions
  await interaction.editReply({ content: result.message });
}
```

## Recommended Action

Option A - Defer all score-related interactions immediately.

## Technical Details

**Affected files**:
- `apps/bot/src/handlers/scoreHandler.ts` (all three handlers)

## Acceptance Criteria

- [ ] All three handlers (score, confirm, dispute) defer immediately
- [ ] Use `editReply` instead of `reply` for the response
- [ ] No interaction timeouts under normal load

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Identified during PR #55 code review | Always defer before async work |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/55
- Discord.js deferred replies: https://discordjs.guide/slash-commands/response-methods.html#deferred-responses
