---
title: Implement Automatic Match Thread Creation
type: feat
date: 2026-01-28
issue: "#10"
revised: 2026-01-28
---

# Implement Automatic Match Thread Creation

## Overview

Create match thread functionality that automatically creates Discord threads when tournament matches become ready. The implementation integrates with the existing polling flow at `pollingService.ts:250` using simple exported functions (no class/singleton pattern).

## Problem Statement

When the polling service detects a match is ready on Start.gg, it creates a database record but has no way to notify players via Discord. Players must manually check Start.gg or rely on external communication.

## Proposed Solution

Implement exported functions in `matchService.ts` that:

1. Create Discord threads for ready matches
2. Add players to threads (when Discord accounts are linked)
3. Send formatted match embeds with check-in buttons
4. Update match state in the database

## Technical Approach

### Architecture

```
pollingService.processSet()
    |
    v (match becomes ready)
createMatchThread(client, matchId)
    |
    ├── Check idempotency (skip if discordThreadId exists)
    ├── Fetch match with players and tournament
    ├── Get channel from Tournament.discordChannelId
    ├── Create thread with formatted name
    ├── Add linked players to thread
    ├── Send embed (with or without check-in buttons)
    └── Update Match.discordThreadId and state
```

### Design Decisions

1. **No class/singleton**: Export plain functions, pass Discord client directly
2. **Channel source**: Use `Tournament.discordChannelId` only (no fallback chain)
3. **Thread type**: PUBLIC_THREAD (accessible without Nitro)
4. **Auto-archive**: 1 day (`ThreadAutoArchiveDuration.OneDay`)
5. **Button format**: `checkin:{matchId}:{playerSlot}` (1 or 2)
6. **Unlinked players**: Display name without mention
7. **Check-in disabled**: Simple `if` statement - no buttons, status = "Ready to play"
8. **Rate limiting**: Trust Discord.js internal handling (it queues and retries automatically)
9. **Error handling**: Log and return `null` - don't break polling loop

### Key Files

| File | Purpose |
|------|---------|
| `apps/bot/src/services/matchService.ts` | Match thread functions |
| `apps/bot/src/handlers/buttonHandlers.ts` | Button handler registry |
| `apps/bot/src/handlers/checkin.ts` | Check-in button handler |
| `apps/bot/src/services/pollingService.ts` | Integration point (line 250) |
| `apps/bot/src/events/interactionCreate.ts` | Route button interactions |
| `apps/bot/src/services/__tests__/matchService.test.ts` | Unit tests |

## Implementation Phases

### Phase 1: Thread Creation with Players and Embed

Create the core functionality: thread creation, player resolution, and embed sending.

**Tasks:**

- [x] Create `apps/bot/src/services/matchService.ts` with exported functions:
  ```typescript
  export async function createMatchThread(
    client: Client,
    matchId: string
  ): Promise<string | null>  // returns threadId or null on failure
  ```

- [x] Implement thread creation logic:
  - Fetch match with `include: { event: { include: { tournament: true } }, players: { include: { user: true } } }`
  - Skip if `match.discordThreadId` already exists (idempotency)
  - Get channel from `tournament.discordChannelId`
  - Create thread with name format: `{roundText} ({identifier}): {player1} vs {player2}`
  - Truncate to 100 chars if needed (truncate player names, preserve round)

- [x] Implement player handling:
  - Resolve Discord IDs via `MatchPlayer.user.discordId`
  - Add linked players with `thread.members.add()` (catch failures, continue)
  - Format mentions: `<@discordId>` for linked, `{playerName}` for unlinked

- [x] Build and send embed (keep function private in matchService.ts):
  - Include match ID, round, player mentions
  - Conditional: if `tournament.requireCheckIn`:
    - Add check-in deadline (`<t:${unix}:R>`)
    - Add check-in buttons
  - Else: status = "Ready to play", no buttons

- [x] Update database:
  - Set `Match.discordThreadId`
  - Set `Match.state = CALLED`
  - Set `Match.checkInDeadline` if check-in enabled

**Acceptance Criteria:**
- Thread created with correct name format
- Linked players added and mentioned
- Unlinked players shown by name only
- Embed displays correctly (with or without check-in)
- Thread ID saved to database
- Match state updated to CALLED

### Phase 2: Button Handler and Polling Integration

Handle check-in button clicks and wire into polling service.

**Tasks:**

- [x] Create button handler registry in `apps/bot/src/handlers/`:
  ```typescript
  // handlers/buttonHandlers.ts
  export interface ButtonHandler {
    prefix: string;
    execute(interaction: ButtonInteraction, parts: string[]): Promise<void>;
  }
  export const buttonHandlers = new Map<string, ButtonHandler>();

  // handlers/checkin.ts
  export const checkinHandler: ButtonHandler = {
    prefix: INTERACTION_PREFIX.CHECK_IN,
    async execute(interaction, parts) { ... }
  };
  ```

- [x] Implement check-in handler:
  - Parse `[matchId, playerSlot]` from parts
  - Validate clicker is the correct player (compare `interaction.user.id` with `MatchPlayer.user.discordId`)
  - Reject with ephemeral message if wrong player
  - Update `MatchPlayer.isCheckedIn = true` and `checkedInAt = now()`
  - Edit embed to show check-in status
  - If both players checked in, update `Match.state = CHECKED_IN`

- [x] Update `interactionCreate.ts` to route buttons:
  ```typescript
  if (interaction.isButton()) {
    const { prefix, parts } = parseInteractionId(interaction.customId);
    const handler = buttonHandlers.get(prefix);
    if (handler) await handler.execute(interaction, parts);
  }
  ```

- [x] Integrate into `pollingService.ts` at line 250:
  ```typescript
  if (result.created) {
    createMatchThread(discordClient, match.id).catch(err =>
      console.error(`[Poll] Thread creation failed for ${match.id}:`, err.message)
    );
  }
  ```

- [x] Add `parseInteractionId` to `packages/shared/src/interactions.ts` if not present (already exists)

**Acceptance Criteria:**
- Button clicks routed to correct handler
- Only correct player can check in
- Embed updates after check-in
- Both checked in transitions match to CHECKED_IN
- Polling loop continues if thread creation fails

### Phase 3: Testing and Edge Cases

Comprehensive tests and edge case handling.

**Tasks:**

- [x] Unit tests for `createMatchThread`:
  - Creates thread for valid match
  - Returns null when match not found
  - Skips when `discordThreadId` already exists
  - Returns null when channel not found
  - Continues when player add fails
  - Handles check-in enabled vs disabled

- [x] Unit tests for check-in handler:
  - Updates status when correct player clicks
  - Rejects when wrong player clicks
  - Rejects when match not found
  - Transitions to CHECKED_IN when both check in

- [x] Integration tests using test harness:
  - Full flow: poll detects match -> thread created -> buttons work

- [x] Handle edge cases:
  - Long player names (truncation)
  - Player left server (catch `thread.members.add()` error)
  - Channel permissions missing (catch and log)

**Acceptance Criteria:**
- All unit tests pass
- Integration test covers happy path
- Edge cases handled gracefully

## Acceptance Criteria

### Functional Requirements

- [ ] Threads created in `Tournament.discordChannelId`
- [ ] Thread name: `{roundText} ({identifier}): {player1} vs {player2}`
- [ ] Thread auto-archives after 1 day
- [ ] Linked players added to thread and mentioned
- [ ] Unlinked players shown by name only
- [ ] Check-in buttons work (correct player validation)
- [ ] Thread ID saved to `Match.discordThreadId`
- [ ] Match state transitions: NOT_STARTED -> CALLED -> CHECKED_IN

### Non-Functional Requirements

- [ ] Thread creation failure doesn't break polling loop
- [ ] Thread names truncated at 100 chars
- [ ] Logging for debugging (success and failures)

### Quality Gates

- [ ] Unit tests pass (`npm run test`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] Linting passes (`npm run lint`)

## Dependencies & Prerequisites

- Existing `pollingService.ts` with TODO markers
- Discord.js v14 Client instance
- Prisma client with Match, MatchPlayer, User models
- Shared constants from `@fightrise/shared`

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bot lacks thread permissions | Low | High | Catch error, log warning, continue |
| Player left Discord server | Low | Low | Catch `members.add()` error, continue |
| Long thread names rejected | Medium | Low | Truncate to 100 chars |
| Race condition on concurrent polls | Low | Medium | Idempotency check on `discordThreadId` |

## Code Examples

### createMatchThread function

```typescript
// apps/bot/src/services/matchService.ts
import { Client, TextChannel, ThreadAutoArchiveDuration, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma, MatchState } from '@fightrise/database';
import { createInteractionId, INTERACTION_PREFIX } from '@fightrise/shared';

export async function createMatchThread(
  client: Client,
  matchId: string
): Promise<string | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      event: { include: { tournament: true } },
      players: { include: { user: true } },
    },
  });

  if (!match) {
    console.error(`[MatchService] Match not found: ${matchId}`);
    return null;
  }

  // Idempotency check
  if (match.discordThreadId) {
    console.log(`[MatchService] Thread already exists for match: ${matchId}`);
    return match.discordThreadId;
  }

  const { tournament } = match.event;
  if (!tournament.discordChannelId) {
    console.error(`[MatchService] No channel configured for tournament: ${tournament.id}`);
    return null;
  }

  const channel = await client.channels.fetch(tournament.discordChannelId);
  if (!channel?.isTextBased() || !('threads' in channel)) {
    console.error(`[MatchService] Invalid channel: ${tournament.discordChannelId}`);
    return null;
  }

  const [player1, player2] = match.players;
  const threadName = formatThreadName(match.roundText, match.identifier, player1.playerName, player2.playerName);

  try {
    const thread = await (channel as TextChannel).threads.create({
      name: threadName,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    });

    // Add players (failures are non-fatal)
    for (const player of match.players) {
      if (player.user?.discordId) {
        try {
          await thread.members.add(player.user.discordId);
        } catch (err) {
          console.warn(`[MatchService] Failed to add player ${player.playerName} to thread`);
        }
      }
    }

    // Send embed
    const embed = buildMatchEmbed(match, tournament.requireCheckIn);
    const components = tournament.requireCheckIn ? [buildCheckInButtons(matchId)] : [];
    await thread.send({ embeds: [embed], components });

    // Update database
    const checkInDeadline = tournament.requireCheckIn
      ? new Date(Date.now() + tournament.checkInWindowMinutes * 60 * 1000)
      : null;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        discordThreadId: thread.id,
        state: MatchState.CALLED,
        checkInDeadline,
      },
    });

    console.log(`[MatchService] Thread created for match: ${matchId}`);
    return thread.id;
  } catch (err) {
    console.error(`[MatchService] Thread creation failed for ${matchId}:`, err);
    return null;
  }
}

function formatThreadName(roundText: string, identifier: string, player1: string, player2: string): string {
  const name = `${roundText} (${identifier}): ${player1} vs ${player2}`;
  if (name.length <= 100) return name;

  // Truncate player names to fit
  const prefix = `${roundText} (${identifier}): `;
  const suffix = ' vs ';
  const maxPlayerLen = Math.floor((100 - prefix.length - suffix.length) / 2) - 2;
  const p1 = player1.length > maxPlayerLen ? player1.slice(0, maxPlayerLen) + '..' : player1;
  const p2 = player2.length > maxPlayerLen ? player2.slice(0, maxPlayerLen) + '..' : player2;
  return `${prefix}${p1}${suffix}${p2}`;
}

function buildMatchEmbed(match: MatchWithPlayers, requireCheckIn: boolean): EmbedBuilder {
  const [player1, player2] = match.players;
  const p1Mention = player1.user?.discordId ? `<@${player1.user.discordId}>` : player1.playerName;
  const p2Mention = player2.user?.discordId ? `<@${player2.user.discordId}>` : player2.playerName;

  const embed = new EmbedBuilder()
    .setTitle(match.roundText)
    .setDescription(`${p1Mention} vs ${p2Mention}`)
    .addFields({ name: 'Match ID', value: match.identifier, inline: true })
    .setColor(0x5865F2);

  if (requireCheckIn && match.checkInDeadline) {
    const unix = Math.floor(match.checkInDeadline.getTime() / 1000);
    embed.addFields(
      { name: 'Status', value: 'Waiting for check-in', inline: true },
      { name: 'Deadline', value: `<t:${unix}:R>`, inline: true }
    );
  } else {
    embed.addFields({ name: 'Status', value: 'Ready to play', inline: true });
  }

  return embed;
}

function buildCheckInButtons(matchId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '1'))
      .setLabel('Check In (Player 1)')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '2'))
      .setLabel('Check In (Player 2)')
      .setStyle(ButtonStyle.Primary)
  );
}
```

### Check-in Button Handler

```typescript
// apps/bot/src/handlers/checkin.ts
import { ButtonInteraction } from 'discord.js';
import { prisma, MatchState } from '@fightrise/database';
import { INTERACTION_PREFIX } from '@fightrise/shared';
import type { ButtonHandler } from './buttonHandlers.js';

export const checkinHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.CHECK_IN,
  async execute(interaction: ButtonInteraction, parts: string[]) {
    const [matchId, playerSlot] = parts;
    const slotIndex = parseInt(playerSlot, 10) - 1;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { players: { include: { user: true } } },
    });

    if (!match) {
      await interaction.reply({ content: 'Match not found.', ephemeral: true });
      return;
    }

    const player = match.players[slotIndex];
    if (!player || player.user?.discordId !== interaction.user.id) {
      await interaction.reply({ content: 'This button is not for you.', ephemeral: true });
      return;
    }

    if (player.isCheckedIn) {
      await interaction.reply({ content: 'You already checked in.', ephemeral: true });
      return;
    }

    await prisma.matchPlayer.update({
      where: { id: player.id },
      data: { isCheckedIn: true, checkedInAt: new Date() },
    });

    // Check if both players are now checked in
    const otherPlayer = match.players[1 - slotIndex];
    if (otherPlayer.isCheckedIn) {
      await prisma.match.update({
        where: { id: matchId },
        data: { state: MatchState.CHECKED_IN },
      });
    }

    await interaction.reply({ content: 'Checked in!', ephemeral: true });
  },
};
```

## References

### Internal References

- Polling integration point: `apps/bot/src/services/pollingService.ts:250`
- Test harness: `apps/bot/src/__tests__/harness/MockChannel.ts`
- Shared constants: `packages/shared/src/constants.ts`
- Prisma schema: `packages/database/prisma/schema.prisma`

### Related Work

- GitHub Issue: #10
- Documented learning: `docs/solutions/integration-issues/startgg-polling-service-implementation.md`

### Review Feedback Applied

- Simplified from class/singleton to exported functions (DHH, Simplicity)
- Reduced from 5 phases to 3 phases (All reviewers)
- Removed complex error type system - use `string | null` (DHH, Simplicity)
- Added button handler registry pattern (Kieran)
- Kept embed builder in bot, not shared package (All reviewers)
- Trust Discord.js rate limiting (Simplicity)
- Added match identifier to thread name (Kieran)
- Removed channel fallback logic (Simplicity)
