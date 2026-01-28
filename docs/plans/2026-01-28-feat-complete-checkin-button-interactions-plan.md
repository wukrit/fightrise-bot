---
title: Complete check-in button interactions
type: feat
date: 2026-01-28
issue: 11
revised: true
---

# Complete Check-in Button Interactions

## Overview

Complete the check-in button interaction system so that when players check in via Discord buttons, the UI updates to reflect progress and transitions the match to "in progress" when ready.

**Current State:** The core check-in logic is already implemented:
- `checkInPlayer()` service function validates user, checks deadline, updates database ✅
- Button handler parses custom ID and delegates to service ✅
- Thread creation with check-in buttons works ✅

**Gap:** When a player checks in or both players complete check-in, the original message embed does not update. Per Issue #11:
- Show who has checked in (partial check-in UI update)
- Replace check-in buttons with score reporting buttons when both players are ready
- Announce that the match is live

## Problem Statement

Players currently receive only an ephemeral confirmation when checking in. There's no visible feedback in the thread showing:
1. Which players have already checked in
2. When the match transitions to "ready to play" status
3. The score reporting buttons to report the match result

This makes it unclear to observers (and even the players themselves) what the match state is.

## Proposed Solution (Simplified)

**Key insight from review:** When a user clicks a button, `interaction.message` IS the message containing the embed and buttons. No need to search for it - we can edit it directly with `interaction.message.edit()`.

Extend the check-in handler to update the original embed message after successful check-ins:

1. **On partial check-in:** Update embed to show ✅ next to the checked-in player
2. **On both players checked in:**
   - Update embed status to "Match Live"
   - Replace check-in buttons with score reporting buttons
   - Send announcement message

## Technical Approach

### Key Files to Modify

| File | Changes |
|------|---------|
| `apps/bot/src/handlers/checkin.ts` | Add embed update logic using `interaction.message.edit()` |
| `apps/bot/src/services/matchService.ts` | Store message ID on thread creation for future reference |
| `apps/bot/src/handlers/__tests__/checkin.test.ts` | Add tests for UI update flow |
| `packages/database/prisma/schema.prisma` | Add `discordMessageId` field to Match model |

### State Flow

```
CALLED (thread created with check-in buttons)
    ↓ Player 1 clicks check-in
    → Update embed: show P1 checked in (via interaction.message.edit)
    ↓ Player 2 clicks check-in
CHECKED_IN (both ready)
    → Update embed: status "Match Live"
    → Replace buttons with score reporting
    → Send announcement message
```

### Implementation Details

#### 1. Add Message ID to Match Model (For Future Use)

While we can use `interaction.message.edit()` for button clicks, storing the message ID allows future updates from BullMQ jobs (e.g., deadline expired notifications).

```prisma
// packages/database/prisma/schema.prisma
model Match {
  // ... existing fields ...
  discordThreadId   String?   @unique
  discordMessageId  String?   // NEW: ID of the embed message for updates
}
```

Update `createMatchThread()` to store the message ID:

```typescript
// apps/bot/src/services/matchService.ts
const sentMessage = await thread.send({ embeds: [embed], components });

await prisma.match.update({
  where: { id: matchId },
  data: { discordEmbedMessageId: sentMessage.id },
});
```

#### 2. Update Check-in Handler (Inline Logic)

Keep the handler simple. Use `interaction.message.edit()` directly since we're responding to the button click on the exact message we need to update.

```typescript
// apps/bot/src/handlers/checkin.ts
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getMatchStatus } from '../services/matchService.js';
import { INTERACTION_PREFIX, createInteractionId, DISCORD_COLORS } from '@fightrise/shared';

export const checkinHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.CHECK_IN,

  async execute(interaction: ButtonInteraction, parts: string[]): Promise<void> {
    // ... existing validation ...

    const result = await checkInPlayer(matchId, interaction.user.id);

    // Reply first (must respond within 3 seconds)
    await interaction.reply({
      content: result.message,
      ephemeral: true,
    });

    // Update the embed if check-in was successful
    if (result.success) {
      const match = await getMatchStatus(matchId);
      if (!match) return;

      const [p1, p2] = match.players;

      // Build player mentions with check-in indicators
      const p1Check = p1.isCheckedIn ? '✅ ' : '';
      const p2Check = p2.isCheckedIn ? '✅ ' : '';
      const p1Mention = p1.discordId ? `${p1Check}<@${p1.discordId}>` : `${p1Check}${p1.playerName}`;
      const p2Mention = p2.discordId ? `${p2Check}<@${p2.discordId}>` : `${p2Check}${p2.playerName}`;

      const embed = new EmbedBuilder()
        .setTitle(match.roundText)
        .setDescription(`${p1Mention} vs ${p2Mention}`)
        .addFields({ name: 'Match ID', value: match.identifier, inline: true });

      if (result.bothCheckedIn) {
        // Match is live - show score reporting buttons
        embed
          .addFields({ name: 'Status', value: '🎮 Match Live', inline: true })
          .setColor(DISCORD_COLORS.SUCCESS);

        const scoreButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '1'))
            .setLabel(`${p1.playerName} Won`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '2'))
            .setLabel(`${p2.playerName} Won`)
            .setStyle(ButtonStyle.Success)
        );

        await interaction.message.edit({ embeds: [embed], components: [scoreButtons] });

        // Announce match is live
        if (interaction.channel?.isThread()) {
          await interaction.channel.send('Match is live! Good luck to both players.');
        }
      } else {
        // Partial check-in - update embed with checkmarks, keep check-in buttons
        embed
          .addFields({ name: 'Status', value: 'Waiting for check-in', inline: true })
          .setColor(DISCORD_COLORS.BLURPLE);

        // Keep the original check-in buttons
        await interaction.message.edit({ embeds: [embed] });
      }
    }
  },
};
```

#### 3. Add Match State Validation

Add a guard in `checkInPlayer()` to ensure match is in `CALLED` state:

```typescript
// apps/bot/src/services/matchService.ts (add to checkInPlayer)
if (match.state !== MatchState.CALLED) {
  return {
    success: false,
    message: 'Check-in is not available for this match.',
    bothCheckedIn: false,
  };
}
```

## Acceptance Criteria

### Functional Requirements
- [x] When a player checks in, the embed shows ✅ next to their name
- [x] When both players check in, the embed status changes to "Match Live"
- [x] When both players check in, buttons change from check-in to score reporting
- [x] An announcement message is sent when match goes live
- [x] Match state is validated before allowing check-in
- [x] Existing error handling still works (wrong user, already checked in, deadline passed)

### Non-Functional Requirements
- [x] UI updates happen within Discord's 3-second interaction timeout
- [x] Message ID is stored for future programmatic updates

### Testing Requirements
- [x] Unit tests for handler with mocked `interaction.message.edit()`
- [x] Test partial check-in updates embed but keeps buttons
- [x] Test full check-in replaces buttons with score reporting
- [x] Test announcement is sent when both players ready

## Task Breakdown

### Task 1: Schema Migration - Add discordMessageId ✅
- Add `discordMessageId` field to Match model
- Run migration: `npm run db:push`

### Task 2: Update createMatchThread() to Store Message ID ✅
- Store `sentMessage.id` after sending the embed
- Update in same transaction as thread ID update

### Task 3: Add Match State Validation to checkInPlayer() ✅
- Return error if match is not in `CALLED` state
- Prevents check-in after match has already started

### Task 4: Update checkinHandler with Embed Updates ✅
- Fetch match status after successful check-in
- Build updated embed with checkmarks
- Use `interaction.message.edit()` to update
- Replace buttons with score reporting when both ready
- Send announcement message when match goes live

### Task 5: Write Tests ✅
- Mock `interaction.message.edit()` in handler tests
- Verify embed content changes based on check-in state
- Verify button components change when match goes live

## References

### Internal References
- Button handler: `apps/bot/src/handlers/checkin.ts`
- Match service: `apps/bot/src/services/matchService.ts`
- `getMatchStatus()`: `apps/bot/src/services/matchService.ts:275-303`
- Interaction prefixes: `packages/shared/src/constants.ts:23-30`
- Discord colors: `packages/shared/src/constants.ts:37-42`

### Related Issues
- Issue #10 (merged): Match thread creation - provides the foundation this builds on
- Issue #12 (future): Score reporting - will use the buttons created here

---

## Review Changes Applied

Based on feedback from DHH, Kieran, and Simplicity reviewers:

| Original | Revised | Rationale |
|----------|---------|-----------|
| Extend `CheckInResult` with player data | Keep unchanged | Handler uses `getMatchStatus()` instead |
| Create `updateMatchThreadEmbed()` function | Inline in handler | Button click provides `interaction.message` directly |
| Refactor `buildMatchEmbed()` with parameters | Build fresh embed inline | Simpler, one-time use |
| 7 tasks | 5 tasks | Consolidated testing, removed unnecessary abstractions |
| Search for message "by bot or pinned" | Use `interaction.message` | Already have the message from button click |
| No message ID storage | Store message ID | Enables future updates from BullMQ jobs |
| No state validation | Add CALLED state check | Prevents invalid check-ins |

**Estimated LOC: ~45 new lines** (down from ~150)
