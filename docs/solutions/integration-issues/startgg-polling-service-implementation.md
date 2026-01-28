---
title: "Start.gg Polling Service with BullMQ"
slug: startgg-polling-bullmq-service
created: 2026-01-28
updated: 2026-01-28
author: claude-opus-4-5

category: integration
type: implementation-pattern
problem_type: api-polling-without-webhooks

tags:
  - bullmq
  - redis
  - polling
  - job-queues
  - startgg-api
  - graphql
  - n-plus-one
  - database-optimization
  - agent-native
  - discord-bot

keywords:
  - polling service
  - BullMQ queue
  - Redis connection singleton
  - N+1 query fix
  - batch prefetch pattern
  - parallel event processing

components:
  - apps/bot
  - packages/database
  - packages/startgg-client
  - packages/shared

related_issues:
  - 9
  - 10
  - 11
  - 12
---

# Start.gg Polling Service with BullMQ

## Problem Statement

Start.gg does not provide webhooks for tournament state changes. We need real-time synchronization of tournament/match data to create Discord threads, handle check-ins, and process score reports.

**Symptoms addressed:**
- Tournament data falls out of sync with Start.gg
- Match state changes not detected automatically
- Need dynamic poll intervals based on tournament activity

## Solution Overview

Implemented a BullMQ-based polling service that:
- Polls Start.gg API at dynamic intervals (15s active, 1min registration, 5min inactive)
- Uses batch prefetch to eliminate N+1 queries
- Processes events in parallel for performance
- Exposes agent-native functions for programmatic access
- Handles graceful shutdown with job completion

## Key Implementation Patterns

### 1. N+1 Query Solution: Batch Prefetch with Map Lookup

**Problem**: Querying the database for each match individually creates O(n) queries.

**Solution**: Prefetch all matches in a single query, store in Map for O(1) lookups.

```typescript
// apps/bot/src/services/pollingService.ts

interface ExistingMatch {
  id: string;
  startggSetId: string;
  state: MatchState;
}

async function syncEventMatches(eventId: string, startggEventId: string) {
  // Single query for all matches
  const existingMatches = await prisma.match.findMany({
    where: { eventId },
    select: { id: true, startggSetId: true, state: true },
  });

  // O(1) lookup via Map
  const matchMap = new Map<string, ExistingMatch>(
    existingMatches.map((m) => [m.startggSetId, m])
  );

  for (const set of setsConnection.nodes) {
    const existingMatch = matchMap.get(set.id); // O(1) instead of DB query
    // ... process set
  }
}
```

### 2. Parallel Processing: Promise.all for Events

**Problem**: Sequential event processing creates unnecessary latency.

**Solution**: Use `Promise.all` to process independent events concurrently.

```typescript
// apps/bot/src/services/pollingService.ts

async function pollTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { events: true },
  });

  // Process all events in parallel
  const results = await Promise.all(
    tournament.events.map((event) => syncEventMatches(event.id, event.startggId))
  );

  // Aggregate results
  let matchesCreated = 0;
  let matchesUpdated = 0;
  for (const result of results) {
    matchesCreated += result.created;
    matchesUpdated += result.updated;
  }
}
```

### 3. Agent-Native Functions

**Problem**: Agents need programmatic access to service state and actions.

**Solution**: Export dedicated functions with clear interfaces.

```typescript
// apps/bot/src/services/pollingService.ts

export interface PollStatus {
  tournamentId: string;
  lastPolledAt: Date | null;
  nextPollAt: Date | null;
  state: TournamentState;
  pollIntervalMs: number | null;
}

// Query service state
export async function getPollStatus(tournamentId: string): Promise<PollStatus | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, lastPolledAt: true, state: true },
  });

  if (!tournament) return null;

  const interval = calculatePollInterval(tournament.state);
  const nextPollAt = tournament.lastPolledAt && interval
    ? new Date(tournament.lastPolledAt.getTime() + interval)
    : null;

  return {
    tournamentId: tournament.id,
    lastPolledAt: tournament.lastPolledAt,
    nextPollAt,
    state: tournament.state,
    pollIntervalMs: interval,
  };
}

// Trigger immediate action
export async function triggerImmediatePoll(tournamentId: string): Promise<{ scheduled: boolean; message: string }> {
  // Validation, then schedule with delay: 0
  await schedulePoll(tournamentId, 0);
  return { scheduled: true, message: 'Poll scheduled for immediate execution' };
}
```

### 4. Cache Eviction: maxEntries with LRU-Style

**Problem**: Unbounded cache causes memory exhaustion.

**Solution**: Use Map's insertion order for FIFO eviction at capacity.

```typescript
// packages/startgg-client/src/cache.ts

export class ResponseCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number;

  set<T>(method: string, params: Record<string, unknown>, value: T): void {
    const key = this.generateKey(method, params);

    // Only evict on new entries (not updates)
    const isNewEntry = !this.cache.has(key);
    if (isNewEntry) {
      // Map maintains insertion order - first key is oldest
      while (this.cache.size >= this.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
```

### 5. Redis Connection Singleton

**Problem**: Redis connections need proper lifecycle management for BullMQ.

**Solution**: Singleton with lazy init, reconnection, and graceful shutdown.

```typescript
// apps/bot/src/lib/redis.ts

let redis: Redis | null = null;

export function getRedisConnection(): Redis {
  if (redis && redis.status === 'ready') return redis;
  if (redis) return redis; // Let ioredis handle reconnection

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL environment variable is required');

  // Security warning for production
  if (process.env.NODE_ENV === 'production' && !redisUrl.startsWith('rediss://')) {
    console.warn('[Redis] WARNING: Production should use rediss:// (TLS) URLs');
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
```

## Code Review Findings Resolved

| ID | Priority | Finding | Fix |
|----|----------|---------|-----|
| 001 | P1 | N+1 queries in match sync | Batch prefetch with Map lookup |
| 002 | P1 | Sequential event processing | Promise.all for parallel processing |
| 003 | P2 | Unsafe Prisma error assertions | PrismaClientKnownRequestError type guard |
| 004 | P2 | No Redis TLS production warning | Added console.warn for non-TLS URLs |
| 005 | P2 | Missing poll logic tests | Added 16 new unit tests (65 total) |
| 006 | P2 | No agent-native accessibility | Exported getPollStatus, triggerImmediatePoll |
| 007 | P3 | Unbounded cache growth | Added maxEntries with LRU eviction |
| 008 | P3 | Log information disclosure | Accepted (tournament data is public) |

## Prevention Strategies

### N+1 Query Prevention

**Checklist:**
- [ ] No database calls inside loops
- [ ] Collections fetched with `findMany` + `{ in: [...] }`
- [ ] Related data loaded with `include`

### Parallel Processing

**Checklist:**
- [ ] Sequential loops justified with dependency comments
- [ ] Independent operations use `Promise.all`
- [ ] External APIs have concurrency limits

### Type-Safe Error Handling

```typescript
// GOOD: Type-safe Prisma error handling
import { Prisma } from '@prisma/client';

catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    // Unique constraint violation - handle gracefully
    return result;
  }
  throw error;
}
```

### Cache Bounds

**Checklist:**
- [ ] All caches have maxEntries limit
- [ ] All cached entries have TTL
- [ ] Cache metrics exposed for monitoring

## Test Coverage

**File:** `apps/bot/src/__tests__/services/pollingService.test.ts`

**Test count:** 65 tests

**Key test areas:**
- `calculatePollInterval` - all tournament states
- `getPollStatus` - found, not found, null timestamps
- `triggerImmediatePoll` - success, not found, completed, service not running
- Match state logic - ready states, completion detection
- Score validation - valid, invalid, null, ties
- Winner determination - player 1 wins, player 2 wins, ties

## Related Documentation

- **Implementation Plan:** [docs/plans/2026-01-28-feat-startgg-polling-bullmq-plan.md](../../plans/2026-01-28-feat-startgg-polling-bullmq-plan.md)
- **Architecture Plan:** [ARCHITECTURE_PLAN.md](../../../ARCHITECTURE_PLAN.md) (Polling Service section)
- **Start.gg Setup:** [docs/STARTGG_SETUP.md](../../STARTGG_SETUP.md)

## Related Issues

- Issue #9: Start.gg polling service (this implementation)
- Issue #10: Discord thread creation (next step)
- Issue #11: Check-in system
- Issue #12: Score reporting

## External References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Start.gg GraphQL Schema Explorer](https://smashgg-schema.netlify.app/)
- [Prisma Error Handling](https://www.prisma.io/docs/concepts/components/prisma-client/handling-errors)
