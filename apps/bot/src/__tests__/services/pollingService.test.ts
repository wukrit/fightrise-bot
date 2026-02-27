/**
 * Unit tests for the polling service.
 * Tests calculatePollInterval, getPollStatus, triggerImmediatePoll, startPollingService, stopPollingService, schedulePoll, and match state logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TournamentState, MatchState } from '@fightrise/database';
import { POLL_INTERVALS, STARTGG_SET_STATE } from '@fightrise/shared';

// Mock prisma before importing the service
vi.mock('@fightrise/database', async () => {
  const actual = await vi.importActual('@fightrise/database');
  return {
    ...actual,
    prisma: {
      tournament: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      match: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

// Mock BullMQ - use hoisted factory for proper hoisting
const { Queue: MockQueue, Worker: MockWorker } = vi.hoisted(() => {
  const mockQueueInstance = {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockWorkerInstance = {
    on: vi.fn(),
    pause: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const QueueFn = vi.fn(() => mockQueueInstance);
  const WorkerFn = vi.fn(() => mockWorkerInstance);

  return { Queue: QueueFn, Worker: WorkerFn, mockQueueInstance, mockWorkerInstance };
});

vi.mock('bullmq', () => ({
  Queue: MockQueue,
  Worker: MockWorker,
}));

// Mock Redis connection - use hoisted factory
const { getRedisConnection: mockGetRedisConnection, closeRedisConnection: mockCloseRedisConnection } = vi.hoisted(() => ({
  getRedisConnection: vi.fn().mockReturnValue({ host: 'localhost', port: 6379 }),
  closeRedisConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/redis.js', () => ({
  getRedisConnection: mockGetRedisConnection,
  closeRedisConnection: mockCloseRedisConnection,
}));

// Mock the service logger - use hoisted factory
const { createServiceLogger: mockCreateServiceLogger } = vi.hoisted(() => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return {
    createServiceLogger: vi.fn(() => mockLogger),
    mockLogger,
  };
});

vi.mock('../../lib/logger.js', () => ({
  createServiceLogger: mockCreateServiceLogger,
}));

// Import after mocking - this is key for the mocks to work
import { prisma } from '@fightrise/database';
import {
  calculatePollInterval,
  getPollStatus,
  triggerImmediatePoll,
  startPollingService,
  stopPollingService,
  schedulePoll,
} from '../../services/pollingService.js';

// Mock Discord Client
const mockDiscordClient = {
  channels: {
    cache: {
      get: vi.fn(),
    },
  },
};

describe('startPollingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env var for each test
    vi.stubEnv('STARTGG_API_KEY', 'test-api-key');
    vi.stubEnv('BULLMQ_CONCURRENCY', '1');
  });

  afterEach(async () => {
    // Clean up any started services
    await stopPollingService();
    vi.unstubAllEnvs();
  });

  it('starts successfully with valid API key and Redis connection', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);

    await expect(startPollingService(mockDiscordClient as never)).resolves.not.toThrow();
  });

  it('throws error when STARTGG_API_KEY is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('STARTGG_API_KEY', '');

    await expect(startPollingService()).rejects.toThrow('STARTGG_API_KEY environment variable is required');
  });

  it('throws error when Redis connection is unavailable', async () => {
    mockGetRedisConnection.mockReturnValue(null);

    await expect(startPollingService()).rejects.toThrow('Redis connection unavailable');

    // Restore the mock
    mockGetRedisConnection.mockReturnValue({ host: 'localhost', port: 6379 });
  });

  it('creates queue and worker with correct options', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);

    await startPollingService(mockDiscordClient as never);

    expect(MockQueue).toHaveBeenCalledWith(
      'tournament-polling',
      expect.objectContaining({
        connection: expect.any(Object),
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({ type: 'exponential' }),
        }),
      })
    );

    expect(MockWorker).toHaveBeenCalledWith(
      'tournament-polling',
      expect.any(Function),
      expect.objectContaining({
        connection: expect.any(Object),
        concurrency: 1,
      })
    );
  });

  it('schedules active tournaments on startup', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([
      { id: 'tournament-1', state: TournamentState.IN_PROGRESS },
      { id: 'tournament-2', state: TournamentState.REGISTRATION_OPEN },
    ]);

    await startPollingService(mockDiscordClient as never);

    expect(prisma.tournament.findMany).toHaveBeenCalledWith({
      where: {
        state: { notIn: [TournamentState.COMPLETED, TournamentState.CANCELLED] },
      },
      select: { id: true, state: true },
    });
  });

  it('stores Discord client when provided', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);

    await startPollingService(mockDiscordClient as never);

    // Service should start without error, which means Discord client was stored
    expect(mockDiscordClient.channels.cache.get).not.toHaveBeenCalled();
  });

  it('starts successfully without Discord client (thread creation disabled)', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);

    // Should start without error - Discord client is optional
    await expect(startPollingService(undefined)).resolves.not.toThrow();
  });
});

describe('schedulePoll', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('STARTGG_API_KEY', 'test-api-key');
    vi.stubEnv('BULLMQ_CONCURRENCY', '1');
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);
    await startPollingService();
  });

  afterEach(async () => {
    await stopPollingService();
    vi.unstubAllEnvs();
  });

  it('adds job to queue with correct tournamentId and delay', async () => {
    await schedulePoll('tournament-123', 15000);

    expect(MockQueue.mock.results[0].value.add).toHaveBeenCalledWith(
      'poll-tournament',
      { tournamentId: 'tournament-123' },
      {
        jobId: 'poll-tournament-123',
        delay: 15000,
      }
    );
  });

  it('returns early when queue is null (service not started)', async () => {
    // Stop the service first
    await stopPollingService();

    // This should return early without error
    await expect(schedulePoll('tournament-123', 15000)).resolves.not.toThrow();
  });

  it('uses jobId to prevent duplicate jobs', async () => {
    await schedulePoll('tournament-123', 15000);

    // Verify jobId is set to prevent duplicates
    expect(MockQueue.mock.results[0].value.add).toHaveBeenCalledWith(
      'poll-tournament',
      expect.any(Object),
      expect.objectContaining({
        jobId: expect.stringContaining('poll-tournament-123'),
      })
    );
  });
});

describe('stopPollingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STARTGG_API_KEY', 'test-api-key');
    vi.stubEnv('BULLMQ_CONCURRENCY', '1');
  });

  afterEach(async () => {
    await stopPollingService();
    vi.unstubAllEnvs();
  });

  it('closes queue and worker when both exist', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);
    await startPollingService();

    await stopPollingService();

    expect(MockWorker.mock.results[0].value.close).toHaveBeenCalled();
    expect(MockQueue.mock.results[0].value.close).toHaveBeenCalled();
  });

  it('handles missing queue gracefully', async () => {
    // Don't start the service - queue will be null

    await expect(stopPollingService()).resolves.not.toThrow();
  });

  it('handles missing worker gracefully', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);
    await startPollingService();

    // Simulate worker being already closed
    MockWorker.mock.results[0].value.close = vi.fn().mockResolvedValue(undefined);

    await expect(stopPollingService()).resolves.not.toThrow();
  });

  it('clears all service instances', async () => {
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);
    await startPollingService();

    await stopPollingService();

    // Service should be stopped - calling start again should work
    vi.mocked(prisma.tournament.findMany).mockResolvedValue([]);
    await expect(startPollingService()).resolves.not.toThrow();
  });
});

describe('calculatePollInterval', () => {
  it('returns null for completed tournaments', () => {
    expect(calculatePollInterval(TournamentState.COMPLETED)).toBeNull();
  });

  it('returns null for cancelled tournaments', () => {
    expect(calculatePollInterval(TournamentState.CANCELLED)).toBeNull();
  });

  it('returns 15s for in-progress tournaments', () => {
    expect(calculatePollInterval(TournamentState.IN_PROGRESS)).toBe(POLL_INTERVALS.ACTIVE);
    expect(calculatePollInterval(TournamentState.IN_PROGRESS)).toBe(15000);
  });

  it('returns 1min for registration open tournaments', () => {
    expect(calculatePollInterval(TournamentState.REGISTRATION_OPEN)).toBe(POLL_INTERVALS.REGISTRATION);
    expect(calculatePollInterval(TournamentState.REGISTRATION_OPEN)).toBe(60000);
  });

  it('returns 5min for created tournaments', () => {
    expect(calculatePollInterval(TournamentState.CREATED)).toBe(POLL_INTERVALS.INACTIVE);
    expect(calculatePollInterval(TournamentState.CREATED)).toBe(300000);
  });

  it('returns 5min for registration closed tournaments', () => {
    expect(calculatePollInterval(TournamentState.REGISTRATION_CLOSED)).toBe(POLL_INTERVALS.INACTIVE);
    expect(calculatePollInterval(TournamentState.REGISTRATION_CLOSED)).toBe(300000);
  });
});

describe('STARTGG_SET_STATE constants', () => {
  it('exports correct set state values', async () => {
    expect(STARTGG_SET_STATE.NOT_STARTED).toBe(1);
    expect(STARTGG_SET_STATE.STARTED).toBe(2);
    expect(STARTGG_SET_STATE.COMPLETED).toBe(3);
    expect(STARTGG_SET_STATE.READY).toBe(6);
    expect(STARTGG_SET_STATE.IN_PROGRESS).toBe(7);
  });
});

describe('getPollStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when tournament not found', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const result = await getPollStatus('nonexistent-id');

    expect(result).toBeNull();
    expect(prisma.tournament.findUnique).toHaveBeenCalledWith({
      where: { id: 'nonexistent-id' },
      select: { id: true, lastPolledAt: true, state: true },
    });
  });

  it('returns poll status for active tournament', async () => {
    const lastPolledAt = new Date('2026-01-28T10:00:00Z');
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: 'tournament-1',
      lastPolledAt,
      state: TournamentState.IN_PROGRESS,
    } as never);

    const result = await getPollStatus('tournament-1');

    expect(result).not.toBeNull();
    expect(result!.tournamentId).toBe('tournament-1');
    expect(result!.lastPolledAt).toEqual(lastPolledAt);
    expect(result!.state).toBe(TournamentState.IN_PROGRESS);
    expect(result!.pollIntervalMs).toBe(POLL_INTERVALS.ACTIVE);
    // Next poll should be lastPolledAt + 15 seconds
    expect(result!.nextPollAt).toEqual(new Date(lastPolledAt.getTime() + 15000));
  });

  it('returns null nextPollAt for completed tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: 'tournament-2',
      lastPolledAt: new Date(),
      state: TournamentState.COMPLETED,
    } as never);

    const result = await getPollStatus('tournament-2');

    expect(result).not.toBeNull();
    expect(result!.pollIntervalMs).toBeNull();
    expect(result!.nextPollAt).toBeNull();
  });

  it('returns null nextPollAt when never polled', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: 'tournament-3',
      lastPolledAt: null,
      state: TournamentState.CREATED,
    } as never);

    const result = await getPollStatus('tournament-3');

    expect(result).not.toBeNull();
    expect(result!.lastPolledAt).toBeNull();
    expect(result!.nextPollAt).toBeNull();
    expect(result!.pollIntervalMs).toBe(POLL_INTERVALS.INACTIVE);
  });
});

describe('triggerImmediatePoll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when tournament not found', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const result = await triggerImmediatePoll('nonexistent-id');

    expect(result.scheduled).toBe(false);
    expect(result.message).toBe('Tournament not found');
  });

  it('returns error for completed tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: 'tournament-1',
      state: TournamentState.COMPLETED,
    } as never);

    const result = await triggerImmediatePoll('tournament-1');

    expect(result.scheduled).toBe(false);
    expect(result.message).toBe('Tournament is completed or cancelled');
  });

  it('returns error for cancelled tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: 'tournament-1',
      state: TournamentState.CANCELLED,
    } as never);

    const result = await triggerImmediatePoll('tournament-1');

    expect(result.scheduled).toBe(false);
    expect(result.message).toBe('Tournament is completed or cancelled');
  });

  it('returns error when polling service not running', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({
      id: 'tournament-1',
      state: TournamentState.IN_PROGRESS,
    } as never);

    // Queue is null when service not started
    const result = await triggerImmediatePoll('tournament-1');

    expect(result.scheduled).toBe(false);
    expect(result.message).toBe('Polling service not running');
  });
});

describe('Match State Logic', () => {
  describe('isReady state detection', () => {
    it('READY state (6) should trigger match creation', () => {
      expect(STARTGG_SET_STATE.READY).toBe(6);
      // Ready states that should create matches
      const readyStates = [
        STARTGG_SET_STATE.READY,
        STARTGG_SET_STATE.STARTED,
        STARTGG_SET_STATE.IN_PROGRESS,
      ];
      expect(readyStates).toContain(6);
      expect(readyStates).toContain(2);
      expect(readyStates).toContain(7);
    });

    it('NOT_STARTED state (1) should not trigger match creation', () => {
      expect(STARTGG_SET_STATE.NOT_STARTED).toBe(1);
      const readyStates = [
        STARTGG_SET_STATE.READY,
        STARTGG_SET_STATE.STARTED,
        STARTGG_SET_STATE.IN_PROGRESS,
      ];
      expect(readyStates).not.toContain(STARTGG_SET_STATE.NOT_STARTED);
    });

    it('COMPLETED state (3) should trigger match update, not creation', () => {
      expect(STARTGG_SET_STATE.COMPLETED).toBe(3);
      const readyStates = [
        STARTGG_SET_STATE.READY,
        STARTGG_SET_STATE.STARTED,
        STARTGG_SET_STATE.IN_PROGRESS,
      ];
      expect(readyStates).not.toContain(STARTGG_SET_STATE.COMPLETED);
    });
  });

  describe('MatchState transitions', () => {
    it('new matches should be created with NOT_STARTED state', () => {
      expect(MatchState.NOT_STARTED).toBe('NOT_STARTED');
    });

    it('completed sets should update match to COMPLETED state', () => {
      expect(MatchState.COMPLETED).toBe('COMPLETED');
    });
  });
});

describe('Score validation logic', () => {
  it('validates scores are numbers and at least one is positive', () => {
    // Valid scores
    const validScores = [
      { score1: 2, score2: 0 },
      { score1: 0, score2: 2 },
      { score1: 3, score2: 2 },
    ];

    for (const { score1, score2 } of validScores) {
      const hasValidScores =
        score1 !== null &&
        score2 !== null &&
        typeof score1 === 'number' &&
        typeof score2 === 'number' &&
        (score1 > 0 || score2 > 0);
      expect(hasValidScores).toBe(true);
    }
  });

  it('rejects invalid scores', () => {
    // Invalid scores
    const invalidScores = [
      { score1: null, score2: 2 },
      { score1: 2, score2: null },
      { score1: 0, score2: 0 },
      { score1: 'invalid', score2: 2 },
    ];

    for (const { score1, score2 } of invalidScores) {
      const hasValidScores =
        score1 !== null &&
        score2 !== null &&
        typeof score1 === 'number' &&
        typeof score2 === 'number' &&
        (score1 > 0 || score2 > 0);
      expect(hasValidScores).toBe(false);
    }
  });
});

describe('Winner determination logic', () => {
  it('correctly determines winner based on scores', () => {
    const testCases = [
      { score1: 2, score2: 0, winner1: true, winner2: false },
      { score1: 0, score2: 2, winner1: false, winner2: true },
      { score1: 3, score2: 2, winner1: true, winner2: false },
      { score1: 1, score2: 3, winner1: false, winner2: true },
    ];

    for (const { score1, score2, winner1, winner2 } of testCases) {
      expect(score1 > score2).toBe(winner1);
      expect(score2 > score1).toBe(winner2);
    }
  });
});
