---
title: "Automatic Match Thread Creation and Button Handler Registry"
category: discord-patterns
module: apps/bot/src/services/matchService.ts
tags:
  - discord-bot
  - thread-creation
  - button-handlers
  - idempotency
  - state-guards
  - agent-native
  - prisma
  - error-handling
symptoms:
  - "Need to create Discord threads when matches are ready"
  - "Button interactions require extensible handler pattern"
  - "Orphaned threads created when database update fails"
  - "Players not added to thread due to rate limits or permissions"
date_resolved: 2026-01-28
issue_number: 10
pr_number: 53
related_commits:
  - f9e7852  # Main implementation
  - 3f45aa9  # Initial implementation
---

# Automatic Match Thread Creation and Button Handler Registry

## Problem Summary

When implementing Discord match threads for tournament matches, several architectural and reliability challenges emerged:

1. **Thread Creation Reliability**: Ensuring threads are tracked in the database
2. **Orphaned Resources**: Discord threads created but database update fails
3. **Button Handler Extensibility**: Adding new button types without modifying routing
4. **Agent-Native Design**: Making features accessible to both Discord UI and external agents
5. **Concurrent Polling**: Thread creation shouldn't block the polling loop

## Root Cause

The naive approach would create threads and update the database as separate, non-atomic operations:

```typescript
// DANGEROUS: Can create orphaned threads
const thread = await channel.threads.create({ name: threadName });
// Gap where database failure leaves orphaned thread
await prisma.match.update({ data: { discordThreadId: thread.id } });
```

Additionally, building handlers directly into `interactionCreate.ts` creates a monolithic file that grows with each new button type.

## Solution

### 1. Idempotency Check Before Creation

**File:** `apps/bot/src/services/matchService.ts:52-56`

```typescript
// Idempotency check - return existing thread ID if present
if (match.discordThreadId) {
  console.log(`[MatchService] Thread already exists for match: ${matchId}`);
  return match.discordThreadId;
}
```

### 2. Immediate Database Update with Cleanup

**File:** `apps/bot/src/services/matchService.ts:99-160`

```typescript
let thread: ThreadChannel | undefined;
try {
  thread = await textChannel.threads.create({
    name: threadName,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
  });

  // Update DB IMMEDIATELY after thread creation
  // Use state guard to prevent duplicate transitions
  const updateResult = await prisma.match.updateMany({
    where: { id: matchId, state: MatchState.NOT_STARTED },
    data: {
      discordThreadId: thread.id,
      state: MatchState.CALLED,
      checkInDeadline,
    },
  });

  if (updateResult.count === 0) {
    // Match already transitioned - clean up orphaned thread
    console.warn(`[MatchService] Match ${matchId} not in NOT_STARTED state`);
    await thread.delete();
    return null;
  }
} catch (err) {
  // Clean up orphaned thread on any failure
  if (thread) {
    try {
      await thread.delete();
    } catch (deleteErr) {
      console.error(`Failed to cleanup orphaned thread`, deleteErr);
    }
  }
  return null;
}
```

### 3. Error-Tolerant Player Addition

**File:** `apps/bot/src/services/matchService.ts:124-134`

```typescript
// Add players in parallel (failures are non-fatal)
const playersWithDiscord = match.players.filter(
  (player): player is typeof player & { user: { discordId: string } } =>
    player.user?.discordId != null
);

const addPlayerPromises = playersWithDiscord.map((player) =>
  thread!.members.add(player.user.discordId).catch(() => {
    console.warn(`[MatchService] Failed to add player ${player.playerName}`);
  })
);

await Promise.allSettled(addPlayerPromises);  // Continue even if some fail
```

### 4. Button Handler Registry Pattern

**File:** `apps/bot/src/handlers/buttonHandlers.ts`

```typescript
export interface ButtonHandler {
  prefix: string;
  execute(interaction: ButtonInteraction, parts: string[]): Promise<void>;
}

export const buttonHandlers = new Map<string, ButtonHandler>();

export function registerButtonHandler(handler: ButtonHandler): void {
  buttonHandlers.set(handler.prefix, handler);
}
```

**File:** `apps/bot/src/handlers/index.ts`

```typescript
import { registerButtonHandler } from './buttonHandlers.js';
import { checkinHandler } from './checkin.js';

registerButtonHandler(checkinHandler);
```

**File:** `apps/bot/src/events/interactionCreate.ts`

```typescript
if (interaction.isButton()) {
  const { prefix, parts } = parseInteractionId(interaction.customId);
  const handler = buttonHandlers.get(prefix);

  if (!handler) {
    console.warn(`Unknown button prefix: ${prefix}`);
    return;
  }

  try {
    await handler.execute(interaction, parts);
  } catch (error) {
    console.error(`Error handling button ${interaction.customId}:`, error);
    await replyWithError(interaction, 'There was an error processing this action.');
  }
}
```

### 5. Fire-and-Forget Polling Integration

**File:** `apps/bot/src/services/pollingService.ts:260-272`

```typescript
// Create Discord thread (fire and forget - don't block polling)
if (discordClient) {
  const createdMatch = await prisma.match.findUnique({
    where: { startggSetId: set.id },
    select: { id: true },
  });
  if (createdMatch) {
    createMatchThread(discordClient, createdMatch.id).catch((err) => {
      console.error(`[Poll] Thread creation failed for ${createdMatch.id}:`, err);
    });
  }
}
```

### 6. Agent-Native Service Functions

**File:** `apps/bot/src/services/matchService.ts:244-524`

```typescript
// Query function - no Discord dependency
export async function getMatchStatus(matchId: string): Promise<MatchStatus | null>

// Mutation function - returns rich result for UI updates
export async function checkInPlayer(
  matchId: string,
  discordId: string
): Promise<CheckInResult> {
  // Business logic with transactions, state guards
  return {
    success: boolean,
    message: string,
    bothCheckedIn: boolean,
    matchStatus?: MatchStatus,  // Included for handler to update UI
  };
}

// Query function - agent can list player's matches
export async function getPlayerMatches(
  discordId: string,
  options?: { state?: MatchState; limit?: number }
): Promise<MatchStatus[]>
```

## Prevention Guidelines

### Keep Handlers Thin

```typescript
// GOOD: Thin handler delegates to service
export const checkinHandler: ButtonHandler = {
  prefix: INTERACTION_PREFIX.CHECK_IN,
  async execute(interaction, parts) {
    // 1. Validate input (5 lines)
    if (parts.length !== 2 || !parts[0]) {
      await interaction.reply({ content: 'Invalid button.', ephemeral: true });
      return;
    }

    // 2. Delegate to service (1 line)
    const result = await checkInPlayer(matchId, interaction.user.id);

    // 3. Reply (must respond within 3 seconds)
    await interaction.reply({ content: result.message, ephemeral: true });

    // 4. Update UI from result.matchStatus (no extra query)
    if (result.success && result.matchStatus) {
      await interaction.message.edit({ embeds: [embed] });
    }
  }
};

// BAD: Thick handler with business logic
export const checkinHandler = {
  async execute(interaction, parts) {
    const match = await prisma.match.findUnique({ ... });  // Query in handler
    if (player.isCheckedIn) { ... }  // Business logic in handler
    await prisma.matchPlayer.update({ ... });  // Mutation in handler
    // 100+ lines of mixed concerns
  }
};
```

### Clean Up Orphaned Resources

```typescript
// SAFE: Cleanup on failure
let thread: ThreadChannel | undefined;
try {
  thread = await channel.threads.create({ ... });
  const result = await prisma.match.updateMany({ ... });

  if (result.count === 0) {
    await thread.delete();  // Clean up orphan
    return null;
  }
} catch (err) {
  if (thread) await thread.delete();  // Clean up orphan
  throw err;
}
```

### Use Promise.allSettled for Parallel Discord Calls

```typescript
// SAFE: Non-blocking failures
const promises = players.map((p) =>
  thread.members.add(p.discordId).catch(() => {
    console.warn(`Failed to add ${p.name}`);
  })
);
await Promise.allSettled(promises);  // All complete, even with failures

// DANGEROUS: One failure stops all
await Promise.all(players.map((p) => thread.members.add(p.discordId)));
```

### Centralize Constants

```typescript
// packages/shared/src/constants.ts
export const DISCORD_LIMITS = {
  THREAD_NAME_MAX_LENGTH: 100,
} as const;

export const DISCORD_COLORS = {
  BLURPLE: 0x5865f2,
  SUCCESS: 0x57f287,
} as const;

export const TIME = {
  MINUTES_TO_MS: 60 * 1000,
} as const;
```

## Key Patterns Applied

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Idempotency | Safe retries | Check `discordThreadId` before creating |
| State Guards | Prevent race conditions | `updateMany` with state in WHERE |
| Resource Cleanup | Prevent orphans | Delete thread if DB update fails |
| Handler Registry | Extensibility | Map-based prefix lookup |
| Fire-and-Forget | Non-blocking | `.catch()` without await |
| Agent-Native APIs | Dual-mode access | Service functions with rich returns |
| Promise.allSettled | Error tolerance | Parallel calls continue on failure |

## Testing Checklist

```typescript
// Thread creation tests
it('should create thread for valid match', ...);
it('should skip when discordThreadId already exists', ...);
it('should return null when channel not found', ...);
it('should continue when player add fails', ...);
it('should cleanup thread when state guard fails', ...);

// Button handler tests
it('should reject malformed customId parts', ...);
it('should delegate to service function', ...);
it('should update embed from result.matchStatus', ...);

// Integration tests
it('should not block polling on thread creation failure', ...);
```

## Related Documentation

### Internal
- [Discord Button Race Conditions](../concurrency-issues/discord-button-race-conditions.md) - Transaction patterns
- [Start.gg Polling Service](../integration-issues/startgg-polling-service-implementation.md) - Polling integration

### Code References
- `apps/bot/src/services/matchService.ts` - Thread creation and agent APIs
- `apps/bot/src/handlers/buttonHandlers.ts` - Handler registry
- `apps/bot/src/handlers/checkin.ts` - Thin handler example
- `apps/bot/src/events/interactionCreate.ts` - Routing logic

### Related Issues/PRs
- Issue #10: Automatic match thread creation
- PR #53: Implementation with code review fixes
- Issue #11: Check-in button interactions (builds on this)

### External
- [Discord.js Threads](https://discord.js.org/docs/packages/discord.js/main/ThreadChannel:Class)
- [Discord Thread Limits](https://discord.com/developers/docs/resources/channel#start-thread-in-forum-or-media-channel)

## Checklist for Future Discord Bot Features

- [ ] Check idempotency - can this be called twice safely?
- [ ] Use state guards with `updateMany` for transitions
- [ ] Clean up Discord resources if database mutation fails
- [ ] Use `Promise.allSettled()` for parallel Discord calls
- [ ] Keep handlers thin - delegate to agent-native services
- [ ] Return rich results from services (include state for UI updates)
- [ ] Use handler registry for new button types
- [ ] Fire-and-forget for non-critical background operations
- [ ] Centralize magic numbers in shared constants
- [ ] Test malformed input, race conditions, and partial failures
