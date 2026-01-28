---
title: "Implement Start.gg polling service with BullMQ"
type: feat
date: 2026-01-28
issue: 9
labels: [bot, api, feature]
---

# Implement Start.gg polling service with BullMQ

## Overview

Create a background job system using BullMQ that polls Start.gg for tournament state changes and updates the database when matches are ready or completed.

**Why this matters:** Start.gg doesn't offer webhooks, so polling is the only way to detect match state changes. Without this service, the database won't stay in sync with tournament progression.

## Problem Statement

After a tournament is set up via `/tournament setup`, there's no automated system to:
1. Detect when matches become ready to play
2. Sync completed match results from Start.gg
3. Update tournament/match state in the database

## Proposed Solution

A single polling service module that:
- Connects to Redis and creates a BullMQ queue/worker
- Polls active tournaments at dynamic intervals
- Creates Match records when sets become ready
- Updates Match records when sets complete
- Reschedules itself based on tournament state

### Architecture

```
Bot Startup
    |
    v
PollingService.start()
    |
    +-- Connect to Redis
    +-- Create Queue + Worker
    +-- Schedule active tournaments
    |
    v
Worker processes poll jobs
    |
    +-- Fetch sets from Start.gg API
    +-- Compare with database
    +-- Create/update Match records
    +-- Reschedule next poll
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/bot/src/lib/redis.ts` | Redis connection singleton |
| `apps/bot/src/services/pollingService.ts` | Queue, worker, and poll logic (all-in-one) |

### Design Decisions

1. **Single file**: All polling logic in one file (~150 lines). No separate worker file, no event emitter.

2. **Direct function calls**: When Discord integration is added (Issue #10), call the handler directly instead of using an event bus.

3. **Concurrency 1**: Process one poll job at a time to avoid race conditions and respect API rate limits.

4. **Trust existing retry logic**: StartGGClient already handles rate limits and retries. No additional BullMQ limiter needed.

## Technical Approach

### Task 1: Extend STARTGG_SET_STATE constants

File: `packages/shared/src/constants.ts`

Add missing set state codes from Start.gg API:

```typescript
export const STARTGG_SET_STATE = {
  NOT_STARTED: 1,
  STARTED: 2,
  COMPLETED: 3,
  READY: 6,        // Both players assigned, ready to call
  IN_PROGRESS: 7,  // Alternative in-progress state
} as const;

export type StartGGSetState = typeof STARTGG_SET_STATE[keyof typeof STARTGG_SET_STATE];
```

### Task 2: Create Redis connection singleton

File: `apps/bot/src/lib/redis.ts`

```typescript
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisConnection(): Redis {
  if (redis && redis.status === 'ready') {
    return redis;
  }

  if (redis) {
    return redis; // Let ioredis handle reconnection
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected');
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

### Task 3: Create polling service

File: `apps/bot/src/services/pollingService.ts`

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection, closeRedisConnection } from '../lib/redis.js';
import { prisma, TournamentState, MatchState } from '@fightrise/database';
import { StartGGClient, AuthError } from '@fightrise/startgg-client';
import { POLL_INTERVALS, STARTGG_SET_STATE } from '@fightrise/shared';

interface PollJobData {
  tournamentId: string;
}

const QUEUE_NAME = 'tournament-polling';

let queue: Queue<PollJobData> | null = null;
let worker: Worker<PollJobData> | null = null;
let client: StartGGClient | null = null;

export async function startPollingService(): Promise<void> {
  // Validate env vars at startup
  const apiKey = process.env.STARTGG_API_KEY;
  if (!apiKey) {
    throw new Error('STARTGG_API_KEY environment variable is required');
  }

  const connection = getRedisConnection();

  // Create client once, reuse for all polls
  client = new StartGGClient({
    apiKey,
    cache: { enabled: true, ttlMs: 30000 },
    retry: { maxRetries: 3 },
  });

  queue = new Queue<PollJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  worker = new Worker<PollJobData>(
    QUEUE_NAME,
    async (job: Job<PollJobData>) => {
      await pollTournament(job.data.tournamentId);
    },
    { connection } // Concurrency defaults to 1
  );

  worker.on('completed', (job) => {
    console.log(`[Poll] Tournament ${job.data.tournamentId} completed`);
  });

  worker.on('failed', (job, err) => {
    if (job) {
      console.error(`[Poll] Tournament ${job.data.tournamentId} failed:`, err.message);
    } else {
      console.error('[Poll] Unknown job failed:', err.message);
    }
  });

  // Schedule polls for all active tournaments
  await scheduleActiveTournaments();
  console.log('[PollingService] Started');
}

async function scheduleActiveTournaments(): Promise<void> {
  const tournaments = await prisma.tournament.findMany({
    where: {
      state: { notIn: [TournamentState.COMPLETED, TournamentState.CANCELLED] },
    },
    select: { id: true, state: true },
  });

  for (const tournament of tournaments) {
    const interval = calculatePollInterval(tournament.state);
    if (interval !== null) {
      await schedulePoll(tournament.id, interval);
    }
  }

  console.log(`[PollingService] Scheduled ${tournaments.length} tournaments`);
}

export async function schedulePoll(tournamentId: string, delayMs: number): Promise<void> {
  if (!queue) return;

  await queue.add(
    'poll-tournament',
    { tournamentId },
    {
      jobId: `poll-${tournamentId}`, // Prevents duplicate jobs
      delay: delayMs,
    }
  );
}

export function calculatePollInterval(state: TournamentState): number | null {
  switch (state) {
    case TournamentState.COMPLETED:
    case TournamentState.CANCELLED:
      return null; // Don't poll
    case TournamentState.IN_PROGRESS:
      return POLL_INTERVALS.ACTIVE; // 15 seconds
    case TournamentState.REGISTRATION_OPEN:
      return POLL_INTERVALS.REGISTRATION; // 1 minute
    default:
      return POLL_INTERVALS.INACTIVE; // 5 minutes
  }
}

async function pollTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { events: true },
  });

  if (!tournament) {
    console.log(`[Poll] Tournament ${tournamentId} not found, skipping`);
    return;
  }

  if (tournament.state === TournamentState.COMPLETED ||
      tournament.state === TournamentState.CANCELLED) {
    return; // Don't reschedule
  }

  try {
    let matchesCreated = 0;
    let matchesUpdated = 0;

    for (const event of tournament.events) {
      const result = await syncEventMatches(event.id, event.startggId);
      matchesCreated += result.created;
      matchesUpdated += result.updated;
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { lastPolledAt: new Date() },
    });

    if (matchesCreated > 0 || matchesUpdated > 0) {
      console.log(`[Poll] Tournament ${tournamentId}: created=${matchesCreated}, updated=${matchesUpdated}`);
    }
  } catch (error) {
    if (error instanceof AuthError) {
      console.error(`[Poll] CRITICAL: Auth error for tournament ${tournamentId}`);
      // Don't reschedule - admin needs to fix API key
      throw error;
    }
    throw error;
  }

  // Reschedule next poll
  const nextInterval = calculatePollInterval(tournament.state);
  if (nextInterval !== null) {
    await schedulePoll(tournamentId, nextInterval);
  }
}

async function syncEventMatches(
  eventId: string,
  startggEventId: string
): Promise<{ created: number; updated: number }> {
  const result = { created: 0, updated: 0 };
  if (!client) return result;

  let page = 1;
  const MAX_PAGES = 100;

  while (page <= MAX_PAGES) {
    const setsConnection = await client.getEventSets(startggEventId, page, 50);
    if (!setsConnection?.nodes?.length) break;

    for (const set of setsConnection.nodes) {
      const setResult = await processSet(set, eventId);
      result.created += setResult.created ? 1 : 0;
      result.updated += setResult.updated ? 1 : 0;
    }

    if (setsConnection.pageInfo.totalPages <= page) break;
    page++;
  }

  return result;
}

async function processSet(
  set: { id: string; identifier: string; fullRoundText: string; round: number; state: number; slots?: Array<{ entrant?: { id: string; name: string } | null; standing?: { stats?: { score?: { value: number | null } } } }> },
  eventId: string
): Promise<{ created: boolean; updated: boolean }> {
  const result = { created: false, updated: false };

  // Skip if not both players assigned
  const player1 = set.slots?.[0]?.entrant;
  const player2 = set.slots?.[1]?.entrant;
  if (!player1 || !player2) return result;

  // Use upsert to handle race conditions
  const isReady = set.state === STARTGG_SET_STATE.READY ||
                  set.state === STARTGG_SET_STATE.STARTED ||
                  set.state === STARTGG_SET_STATE.IN_PROGRESS;

  const existingMatch = await prisma.match.findUnique({
    where: { startggSetId: set.id },
  });

  // Create new match if ready and doesn't exist
  if (!existingMatch && isReady) {
    try {
      await prisma.match.create({
        data: {
          startggSetId: set.id,
          identifier: set.identifier,
          roundText: set.fullRoundText,
          round: set.round,
          state: MatchState.NOT_STARTED,
          eventId,
          players: {
            create: [
              { startggEntrantId: player1.id, playerName: player1.name },
              { startggEntrantId: player2.id, playerName: player2.name },
            ],
          },
        },
      });
      result.created = true;
      console.log(`[Poll] Match ready: ${set.fullRoundText} - ${player1.name} vs ${player2.name}`);
      // TODO: Create Discord thread here (Issue #10)
    } catch (error) {
      // Unique constraint violation = already created by another poll
      if ((error as { code?: string }).code === 'P2002') {
        return result;
      }
      throw error;
    }
    return result;
  }

  // Update existing match if completed
  if (existingMatch &&
      set.state === STARTGG_SET_STATE.COMPLETED &&
      existingMatch.state !== MatchState.COMPLETED) {

    const score1 = set.slots?.[0]?.standing?.stats?.score?.value;
    const score2 = set.slots?.[1]?.standing?.stats?.score?.value;
    const hasValidScores = score1 !== null && score2 !== null && (score1 > 0 || score2 > 0);

    await prisma.match.update({
      where: { id: existingMatch.id },
      data: {
        state: MatchState.COMPLETED,
        ...(hasValidScores && {
          players: {
            updateMany: [
              {
                where: { startggEntrantId: player1.id },
                data: { reportedScore: score1, isWinner: score1 > score2! },
              },
              {
                where: { startggEntrantId: player2.id },
                data: { reportedScore: score2, isWinner: score2! > score1 },
              },
            ],
          },
        }),
      },
    });
    result.updated = true;
    console.log(`[Poll] Match completed: ${set.fullRoundText}`);
    // TODO: Archive Discord thread (Issue #10)
  }

  return result;
}

export async function stopPollingService(): Promise<void> {
  if (worker) {
    await worker.pause();

    // Wait for current job with 30s timeout
    const closePromise = worker.close();
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 30000)
    );

    try {
      await Promise.race([closePromise, timeout]);
    } catch {
      console.warn('[PollingService] Worker close timed out');
    }
    worker = null;
  }

  if (queue) {
    await queue.close();
    queue = null;
  }

  client = null;
  await closeRedisConnection();
  console.log('[PollingService] Stopped');
}
```

### Task 4: Integrate with bot startup

File: `apps/bot/src/index.ts`

Add polling service to startup and shutdown:

```typescript
import { startPollingService, stopPollingService } from './services/pollingService.js';

async function main() {
  // ... existing setup

  await startPollingService();
  await client.login(token);
}

const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await stopPollingService();
  client.destroy();
  process.exit(0);
};
```

### Task 5: Add poll scheduling to tournament setup

File: `apps/bot/src/services/tournamentService.ts`

When a tournament is saved, schedule its first poll:

```typescript
import { schedulePoll, calculatePollInterval } from './pollingService.js';

async saveTournamentConfig(params: {...}): Promise<TournamentSetupResult> {
  const tournament = await prisma.tournament.upsert({...});

  // Schedule polling for this tournament
  const interval = calculatePollInterval(tournament.state);
  if (interval !== null) {
    await schedulePoll(tournament.id, interval);
  }

  return {...};
}
```

## Acceptance Criteria

- [x] Polling service starts with bot and connects to Redis
- [x] Active tournaments are polled on startup
- [x] New matches (state=ready, both players) are created in database
- [x] Completed matches are detected and state updated
- [x] Poll interval adjusts based on tournament state (15s active, 5min inactive)
- [x] Graceful shutdown waits for current job (max 30s)
- [x] No duplicate matches created (unique constraint + jobId deduplication)

## Testing Strategy

### Unit Tests

```typescript
// apps/bot/src/__tests__/services/pollingService.test.ts

describe('calculatePollInterval', () => {
  it('returns null for completed tournaments', () => {
    expect(calculatePollInterval(TournamentState.COMPLETED)).toBeNull();
  });

  it('returns 15s for in-progress tournaments', () => {
    expect(calculatePollInterval(TournamentState.IN_PROGRESS)).toBe(15000);
  });

  it('returns 5min for inactive tournaments', () => {
    expect(calculatePollInterval(TournamentState.CREATED)).toBe(300000);
  });
});

describe('processSet', () => {
  it('creates match when set is ready with both players');
  it('ignores sets with missing players');
  it('handles unique constraint violation gracefully');
  it('updates match when set completes with valid scores');
  it('skips score update when scores are null');
});
```

### Integration Tests

Extend MSW handlers in `packages/startgg-client/src/__mocks__/`:

```typescript
// handlers.ts - add fixture for multiple set states
graphql.query('GetEventSets', ({ variables }) => {
  return HttpResponse.json({
    data: {
      event: {
        sets: {
          pageInfo: { total: 3, totalPages: 1 },
          nodes: [
            { id: 'set-1', state: 6, ... }, // Ready
            { id: 'set-2', state: 3, ... }, // Completed
            { id: 'set-3', state: 1, ... }, // Not started
          ],
        },
      },
    },
  });
});
```

## Dependencies

- [x] BullMQ installed (`bullmq: ^5.0.0`)
- [x] ioredis installed (`ioredis: ^5.3.0`)
- [x] Prisma schema has `lastPolledAt` field
- [x] `POLL_INTERVALS` defined in `@fightrise/shared`
- [x] `StartGGClient.getEventSets()` exists
- [ ] Redis available via `REDIS_URL`

## Future Work (Not This Issue)

- **Issue #10**: Discord thread creation when `match:ready`
- **Issue #11**: Check-in system using match state
- **Issue #12**: Score reporting and confirmation

When implementing Issue #10, add Discord handler calls directly in `processSet()` where the TODO comments are.

## References

- Architecture plan: `ARCHITECTURE_PLAN.md:1113-1156`
- Poll intervals: `packages/shared/src/constants.ts:4-9`
- Start.gg client: `packages/startgg-client/src/index.ts`
- BullMQ docs: https://docs.bullmq.io/
