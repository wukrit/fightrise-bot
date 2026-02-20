import { Queue, Worker, Job } from 'bullmq';
import type { Client } from 'discord.js';
import { getRedisConnection, closeRedisConnection } from '../lib/redis.js';
import { prisma, TournamentState, MatchState, Prisma } from '@fightrise/database';
import { StartGGClient, AuthError, Set, SetState } from '@fightrise/startgg-client';
import { POLL_INTERVALS } from '@fightrise/shared';
import { createMatchThread } from './matchService.js';
import { RegistrationSyncService } from './registrationSyncService.js';
import { createServiceLogger } from '../lib/logger.js';

const logger = createServiceLogger('PollingService');

// Type for prefetched match data
interface ExistingMatch {
  id: string;
  startggSetId: string;
  state: MatchState;
}

interface PollJobData {
  tournamentId: string;
}

const QUEUE_NAME = 'tournament-polling';

let queue: Queue<PollJobData> | null = null;
let worker: Worker<PollJobData> | null = null;
let startggClient: StartGGClient | null = null;
let registrationSyncService: RegistrationSyncService | null = null;
let discordClient: Client | null = null;

export async function startPollingService(discord?: Client): Promise<void> {
  // Validate env vars at startup
  const apiKey = process.env.STARTGG_API_KEY;
  if (!apiKey) {
    throw new Error('STARTGG_API_KEY environment variable is required');
  }

  // Store Discord client for thread creation
  discordClient = discord ?? null;
  if (!discordClient) {
    logger.warn('No Discord client provided - thread creation disabled');
  }

  const connection = getRedisConnection();

  // BullMQ requires Redis connection - fail fast if not available
  if (!connection) {
    throw new Error('Redis connection unavailable - polling service requires Redis');
  }

  // Create Start.gg client once, reuse for all polls
  startggClient = new StartGGClient({
    apiKey,
    cache: { enabled: true, ttlMs: 30000, maxEntries: 500 },
    retry: { maxRetries: 3 },
  });

  // Create RegistrationSyncService once, reuse for all polls
  registrationSyncService = new RegistrationSyncService(apiKey);

  queue = new Queue<PollJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  // Get configurable concurrency from env (default: 1 for stability)
  const concurrency = parseInt(process.env.BULLMQ_CONCURRENCY || '1', 10);

  worker = new Worker<PollJobData>(
    QUEUE_NAME,
    async (job: Job<PollJobData>) => {
      await pollTournament(job.data.tournamentId);
    },
    { connection, concurrency }
  );

  worker.on('completed', (job) => {
    logger.info({ tournamentId: job.data.tournamentId }, 'Tournament poll completed');
  });

  worker.on('failed', (job, err) => {
    if (job) {
      logger.error({ err, tournamentId: job.data.tournamentId }, 'Tournament poll failed');
    } else {
      logger.error({ err }, 'Unknown job failed');
    }
  });

  // Schedule polls for all active tournaments
  await scheduleActiveTournaments();
  logger.info('PollingService started');
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

  logger.info({ count: tournaments.length }, 'Scheduled tournaments for polling');
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

/**
 * Get the RegistrationSyncService instance (creates if not exists)
 */
export function getRegistrationSyncService(): RegistrationSyncService {
  if (!registrationSyncService) {
    throw new Error('PollingService not started - call startPollingService first');
  }
  return registrationSyncService;
}

async function pollTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { events: true },
  });

  if (!tournament) {
    logger.debug({ tournamentId }, 'Tournament not found, skipping');
    return;
  }

  if (tournament.state === TournamentState.COMPLETED || tournament.state === TournamentState.CANCELLED) {
    return; // Don't reschedule
  }

  try {
    // Sync registrations from Start.gg for all events
    // Use shorter interval during registration phase
    const syncService = getRegistrationSyncService();
    for (const event of tournament.events) {
      try {
        const syncResult = await syncService.syncEventRegistrations(event.id, discordClient ?? undefined);
        if (syncResult.newRegistrations > 0 || syncResult.updatedRegistrations > 0) {
          logger.info(
            { eventId: event.id, newRegistrations: syncResult.newRegistrations, updatedRegistrations: syncResult.updatedRegistrations },
            'Event registrations synced'
          );
        }
      } catch (syncError) {
        logger.error({ err: syncError, eventId: event.id }, 'Registration sync failed');
        // Continue with match sync even if registration sync fails
      }
    }

    // Process all events in parallel (P1 fix: sequential → parallel)
    const results = await Promise.all(
      tournament.events.map((event) => syncEventMatches(event.id, event.startggId))
    );

    let matchesCreated = 0;
    let matchesUpdated = 0;
    for (const result of results) {
      matchesCreated += result.created;
      matchesUpdated += result.updated;
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { lastPolledAt: new Date() },
    });

    if (matchesCreated > 0 || matchesUpdated > 0) {
      logger.info({ tournamentId, matchesCreated, matchesUpdated }, 'Tournament matches synced');
    }
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error({ err: error, tournamentId }, 'CRITICAL: Auth error for tournament');
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
  if (!startggClient) return result;

  // P1 fix: Prefetch all existing matches for this event (eliminates N+1 queries)
  const existingMatches = await prisma.match.findMany({
    where: { eventId },
    select: { id: true, startggSetId: true, state: true },
  });
  const matchMap = new Map<string, ExistingMatch>(
    existingMatches.map((m) => [m.startggSetId, m])
  );

  let page = 1;
  const MAX_PAGES = 100;

  while (page <= MAX_PAGES) {
    const setsConnection = await startggClient.getEventSets(startggEventId, page, 50);
    if (!setsConnection?.nodes?.length) break;

    for (const set of setsConnection.nodes) {
      const setResult = await processSet(set, eventId, matchMap);
      result.created += setResult.created ? 1 : 0;
      result.updated += setResult.updated ? 1 : 0;
    }

    if (setsConnection.pageInfo.totalPages <= page) break;
    page++;
  }

  return result;
}

async function processSet(
  set: Set,
  eventId: string,
  matchMap: Map<string, ExistingMatch>
): Promise<{ created: boolean; updated: boolean }> {
  const result = { created: false, updated: false };

  // Skip if not both players assigned
  const player1 = set.slots?.[0]?.entrant;
  const player2 = set.slots?.[1]?.entrant;
  if (!player1 || !player2) return result;

  // Check if set is ready for a match
  const isReady =
    set.state === SetState.READY ||
    set.state === SetState.STARTED ||
    set.state === SetState.ACTIVE;

  // P1 fix: Use prefetched map instead of database query (O(1) lookup)
  const existingMatch = matchMap.get(set.id);

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
      logger.info({ matchRound: set.fullRoundText, player1: player1.name, player2: player2.name }, 'Match ready');

      // Create Discord thread for the match (fire and forget - don't block polling)
      if (discordClient) {
        // Get the created match ID from the database
        const createdMatch = await prisma.match.findUnique({
          where: { startggSetId: set.id },
          select: { id: true },
        });
        if (createdMatch) {
          createMatchThread(discordClient, createdMatch.id).catch((err) => {
            logger.error({ err, matchId: createdMatch.id }, 'Thread creation failed');
          });
        }
      }
    } catch (error) {
      // P2 fix: Use proper Prisma error type instead of unsafe assertion
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return result;
      }
      throw error;
    }
    return result;
  }

  // Update existing match if completed
  if (existingMatch && set.state === SetState.COMPLETED && existingMatch.state !== MatchState.COMPLETED) {
    const score1 = set.slots?.[0]?.standing?.stats?.score?.value ?? null;
    const score2 = set.slots?.[1]?.standing?.stats?.score?.value ?? null;
    const validScore1 = typeof score1 === 'number' ? score1 : 0;
    const validScore2 = typeof score2 === 'number' ? score2 : 0;
    const hasValidScores =
      score1 !== null && score2 !== null && typeof score1 === 'number' && typeof score2 === 'number' && (score1 > 0 || score2 > 0);

    await prisma.match.update({
      where: { id: existingMatch.id },
      data: {
        state: MatchState.COMPLETED,
        ...(hasValidScores && {
          players: {
            updateMany: [
              {
                where: { startggEntrantId: player1.id },
                data: { reportedScore: validScore1, isWinner: validScore1 > validScore2 },
              },
              {
                where: { startggEntrantId: player2.id },
                data: { reportedScore: validScore2, isWinner: validScore2 > validScore1 },
              },
            ],
          },
        }),
      },
    });
    result.updated = true;
    logger.info({ matchRound: set.fullRoundText }, 'Match completed');
    // TODO: Archive Discord thread (Issue #10)
  }

  return result;
}

// ============================================================================
// Agent-Native Functions
// These functions allow agents and automated systems to inspect and trigger polls
// ============================================================================

/**
 * Get the current poll status for a tournament
 * Useful for agents to check when a tournament was last polled and when the next poll is scheduled
 */
export interface PollStatus {
  tournamentId: string;
  lastPolledAt: Date | null;
  nextPollAt: Date | null;
  state: TournamentState;
  pollIntervalMs: number | null;
}

export async function getPollStatus(tournamentId: string): Promise<PollStatus | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, lastPolledAt: true, state: true },
  });

  if (!tournament) return null;

  const interval = calculatePollInterval(tournament.state);
  const nextPollAt =
    tournament.lastPolledAt && interval ? new Date(tournament.lastPolledAt.getTime() + interval) : null;

  return {
    tournamentId: tournament.id,
    lastPolledAt: tournament.lastPolledAt,
    nextPollAt,
    state: tournament.state,
    pollIntervalMs: interval,
  };
}

/**
 * Trigger an immediate poll for a tournament
 * Useful for agents to force a refresh of tournament data without waiting for the next scheduled poll
 */
export async function triggerImmediatePoll(tournamentId: string): Promise<{ scheduled: boolean; message: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, state: true },
  });

  if (!tournament) {
    return { scheduled: false, message: 'Tournament not found' };
  }

  if (tournament.state === TournamentState.COMPLETED || tournament.state === TournamentState.CANCELLED) {
    return { scheduled: false, message: 'Tournament is completed or cancelled' };
  }

  if (!queue) {
    return { scheduled: false, message: 'Polling service not running' };
  }

  await schedulePoll(tournamentId, 0); // Schedule with no delay
  return { scheduled: true, message: 'Poll scheduled for immediate execution' };
}

export async function stopPollingService(): Promise<void> {
  // Get configurable shutdown timeout from env (default: 30 seconds)
  const shutdownTimeoutMs = parseInt(process.env.BULLMQ_SHUTDOWN_TIMEOUT || '30000', 10);

  if (worker) {
    // Pause the worker to stop accepting new jobs
    await worker.pause();

    // Close worker with configurable timeout - BullMQ handles in-flight jobs automatically
    const closePromise = worker.close();
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Worker close timeout')), shutdownTimeoutMs)
    );

    try {
      await Promise.race([closePromise, timeout]);
    } catch {
      logger.warn('Worker close timed out, forcing close');
      // Force close by not waiting - worker will close when jobs finish
    }
    worker = null;
  }

  if (queue) {
    await queue.close();
    queue = null;
  }

  startggClient = null;
  registrationSyncService = null;
  discordClient = null;
  await closeRedisConnection();
  logger.info('PollingService stopped');
}
