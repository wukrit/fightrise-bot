import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection, closeRedisConnection } from '../lib/redis.js';
import { prisma, TournamentState, MatchState, Prisma } from '@fightrise/database';
import { StartGGClient, AuthError, Set } from '@fightrise/startgg-client';
import { POLL_INTERVALS, STARTGG_SET_STATE } from '@fightrise/shared';

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

  if (tournament.state === TournamentState.COMPLETED || tournament.state === TournamentState.CANCELLED) {
    return; // Don't reschedule
  }

  try {
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
    const setsConnection = await client.getEventSets(startggEventId, page, 50);
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
    set.state === STARTGG_SET_STATE.READY ||
    set.state === STARTGG_SET_STATE.STARTED ||
    set.state === STARTGG_SET_STATE.IN_PROGRESS;

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
      console.log(`[Poll] Match ready: ${set.fullRoundText} - ${player1.name} vs ${player2.name}`);
      // TODO: Create Discord thread here (Issue #10)
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
  if (existingMatch && set.state === STARTGG_SET_STATE.COMPLETED && existingMatch.state !== MatchState.COMPLETED) {
    const score1 = set.slots?.[0]?.standing?.stats?.score?.value ?? null;
    const score2 = set.slots?.[1]?.standing?.stats?.score?.value ?? null;
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
                data: { reportedScore: score1 as number, isWinner: (score1 as number) > (score2 as number) },
              },
              {
                where: { startggEntrantId: player2.id },
                data: { reportedScore: score2 as number, isWinner: (score2 as number) > (score1 as number) },
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
    const timeout = new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000));

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
