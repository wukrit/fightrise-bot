import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChannelType, Client } from 'discord.js';
import { setupTransactionMock } from '../../__tests__/utils/transactionMock.js';

// Mock the database before imports
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    matchPlayer: {
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    // Transaction mock that executes callback with prisma-like tx object
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        matchPlayer: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          count: vi.fn().mockResolvedValue(1),
        },
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    }),
  },
  MatchState: {
    NOT_STARTED: 'NOT_STARTED',
    CALLED: 'CALLED',
    CHECKED_IN: 'CHECKED_IN',
    IN_PROGRESS: 'IN_PROGRESS',
    PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
    COMPLETED: 'COMPLETED',
    DISPUTED: 'DISPUTED',
  },
  Prisma: {},
}));

// Mock the shared package
vi.mock('@fightrise/shared', () => ({
  createInteractionId: vi.fn((...parts: string[]) => parts.join(':')),
  INTERACTION_PREFIX: {
    CHECK_IN: 'checkin',
  },
  DISCORD_LIMITS: {
    THREAD_NAME_MAX_LENGTH: 100,
  },
  DISCORD_COLORS: {
    BLURPLE: 0x5865f2,
    SUCCESS: 0x57f287,
    WARNING: 0xfee75c,
    ERROR: 0xed4245,
  },
  TIME: {
    MINUTES_TO_MS: 60 * 1000,
    SECONDS_TO_MS: 1000,
  },
}));

import { prisma } from '@fightrise/database';
import {
  createMatchThread,
  formatThreadName,
  checkInPlayer,
  getMatchStatus,
  getPlayerMatches,
  reportScore,
  confirmResult,
} from '../matchService.js';

// Helper to create a mock thread with members.add method
function createMockThread(id: string, name: string, addSuccess = true) {
  return {
    id,
    name,
    members: {
      add: addSuccess
        ? vi.fn().mockResolvedValue(undefined)
        : vi.fn().mockRejectedValue(new Error('Cannot add user')),
    },
    send: vi.fn().mockResolvedValue({ id: 'msg-1' }),
  };
}

describe('MatchService', () => {
  // Mock Discord client with proper typing
  let mockClient: Pick<Client, 'channels'>;

  // Properly typed mock for channels.fetch return value
  interface MockChannel {
    type: ChannelType;
    threads?: {
      create: ReturnType<typeof vi.fn>;
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Discord client with default success behavior
    mockClient = {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          type: ChannelType.GuildText,
          threads: {
            create: vi.fn().mockImplementation(async (options: { name: string }) => {
              return createMockThread('thread-new-123', options.name);
            }),
          },
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMatchThread', () => {
    const mockMatch = {
      id: 'match-123',
      startggSetId: 'set-456',
      identifier: 'WF1',
      roundText: 'Winners Finals',
      round: 3,
      state: 'NOT_STARTED',
      discordThreadId: null,
      checkInDeadline: null,
      eventId: 'event-789',
      event: {
        id: 'event-789',
        tournament: {
          id: 'tournament-abc',
          discordGuildId: 'guild-456',
          discordChannelId: 'channel-123',
          requireCheckIn: true,
          checkInWindowMinutes: 10,
        },
      },
      players: [
        {
          id: 'player-1',
          playerName: 'Player1',
          isCheckedIn: false,
          user: {
            id: 'user-1',
            discordId: 'discord-111',
          },
        },
        {
          id: 'player-2',
          playerName: 'Player2',
          isCheckedIn: false,
          user: {
            id: 'user-2',
            discordId: 'discord-222',
          },
        },
      ],
    };

    it('should create thread for valid match', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as unknown);

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBe('thread-new-123');
      expect(prisma.match.updateMany).toHaveBeenCalledWith({
        where: { id: 'match-123', state: 'NOT_STARTED' },
        data: expect.objectContaining({
          discordThreadId: 'thread-new-123',
          state: 'CALLED',
        }),
      });
    });

    it('should return null when match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await createMatchThread(mockClient as unknown as Client, 'match-nonexistent');

      expect(result).toBeNull();
      expect(prisma.match.updateMany).not.toHaveBeenCalled();
    });

    it('should return existing thread ID when match already has thread (idempotency)', async () => {
      const matchWithThread = {
        ...mockMatch,
        discordThreadId: 'existing-thread-456',
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchWithThread as unknown);

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBe('existing-thread-456');
      expect(prisma.match.updateMany).not.toHaveBeenCalled();
    });

    it('should return null when tournament has no channel configured', async () => {
      const matchNoChannel = {
        ...mockMatch,
        event: {
          ...mockMatch.event,
          tournament: {
            ...mockMatch.event.tournament,
            discordChannelId: null,
          },
        },
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchNoChannel as unknown);

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBeNull();
    });

    it('should return null when channel fetch fails', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      mockClient.channels.fetch.mockRejectedValue(new Error('Channel not found'));

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBeNull();
    });

    it('should return null when channel is wrong type', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      mockClient.channels.fetch.mockResolvedValue({
        type: ChannelType.GuildVoice, // Wrong type
      });

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBeNull();
    });

    it('should continue when player add fails', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as unknown);

      // Override channel mock to have member add fail
      mockClient.channels.fetch.mockResolvedValue({
        type: ChannelType.GuildText,
        threads: {
          create: vi.fn().mockResolvedValue(
            createMockThread('thread-new-123', 'Winners Finals (WF1): Player1 vs Player2', false)
          ),
        },
      });

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      // Should still succeed even though adding players failed
      expect(result).toBe('thread-new-123');
    });

    it('should not include check-in buttons when requireCheckIn is false', async () => {
      const matchNoCheckIn = {
        ...mockMatch,
        event: {
          ...mockMatch.event,
          tournament: {
            ...mockMatch.event.tournament,
            requireCheckIn: false,
          },
        },
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchNoCheckIn as unknown);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as unknown);

      // Track what was sent to thread
      let sentComponents: unknown[] = [];
      const mockThread = {
        id: 'thread-new-123',
        name: 'Winners Finals (WF1): Player1 vs Player2',
        members: {
          add: vi.fn().mockResolvedValue(undefined),
        },
        send: vi.fn().mockImplementation(async (options: { components?: unknown[] }) => {
          sentComponents = options.components ?? [];
          return { id: 'msg-1' };
        }),
      };

      mockClient.channels.fetch.mockResolvedValue({
        type: ChannelType.GuildText,
        threads: {
          create: vi.fn().mockResolvedValue(mockThread),
        },
      });

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBe('thread-new-123');
      expect(sentComponents).toHaveLength(0); // No buttons when check-in disabled
    });

    it('should set checkInDeadline when requireCheckIn is true', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as unknown);

      await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(prisma.match.updateMany).toHaveBeenCalledWith({
        where: { id: 'match-123', state: 'NOT_STARTED' },
        data: expect.objectContaining({
          checkInDeadline: expect.any(Date),
        }),
      });
    });

    it('should return null when match has fewer than 2 players', async () => {
      const matchOnePlayer = {
        ...mockMatch,
        players: [mockMatch.players[0]],
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchOnePlayer as unknown);

      const result = await createMatchThread(mockClient as unknown as Client, 'match-123');

      expect(result).toBeNull();
    });
  });

  describe('formatThreadName', () => {
    it('should format standard match name', () => {
      const result = formatThreadName('Winners Round 1', 'A1', 'PlayerOne', 'PlayerTwo');
      expect(result).toBe('Winners Round 1 (A1): PlayerOne vs PlayerTwo');
    });

    it('should not truncate when under 100 chars', () => {
      const result = formatThreadName('WR1', 'A1', 'P1', 'P2');
      expect(result).toBe('WR1 (A1): P1 vs P2');
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should truncate long player names while preserving round text', () => {
      const longName1 = 'VeryLongGamerTagThatExceedsNormalLengthAndWouldBreakTheLimit';
      const longName2 = 'AnotherExtremelyLongGamerTagThatAlsoExceedsTheLimits';
      const result = formatThreadName('Winners Semifinal', 'WS1', longName1, longName2);

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('Winners Semifinal (WS1):');
      expect(result).toContain(' vs ');
      expect(result).toContain('..');
    });

    it('should handle empty player names gracefully', () => {
      const result = formatThreadName('Round 1', 'R1', '', '');
      expect(result).toBe('Round 1 (R1):  vs ');
    });

    it('should handle special characters in player names', () => {
      const result = formatThreadName('Round 1', 'R1', 'Player<One>', 'Player|Two');
      expect(result).toBe('Round 1 (R1): Player<One> vs Player|Two');
    });
  });

  // ============================================================================
  // Agent-Native Function Tests
  // ============================================================================

  describe('checkInPlayer', () => {
    const mockMatch = {
      id: 'match-123',
      identifier: 'WF1',
      state: 'CALLED',
      checkInDeadline: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      players: [
        {
          id: 'player-1',
          playerName: 'Player1',
          isCheckedIn: false,
          checkedInAt: null,
          user: { id: 'user-1', discordId: 'discord-111' },
        },
        {
          id: 'player-2',
          playerName: 'Player2',
          isCheckedIn: false,
          checkedInAt: null,
          user: { id: 'user-2', discordId: 'discord-222' },
        },
      ],
    };

    it('should check in player successfully', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      // Transaction mock returns partial check-in (1 player)
      const txClient = setupTransactionMock(prisma, {
        matchPlayer: {
          count: vi.fn().mockResolvedValue(1), // Only 1 player checked in
        },
      });

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Checked in! Waiting for your opponent.');
      expect(result.bothCheckedIn).toBe(false);
    });

    it('should return both checked in when both players are ready', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      // Transaction mock returns both players checked in
      const txClient = setupTransactionMock(prisma, {
        matchPlayer: {
          count: vi.fn().mockResolvedValue(2), // Both players checked in
        },
      });

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Checked in! Both players are ready - match can begin!');
      expect(result.bothCheckedIn).toBe(true);
    });

    it('should return error when match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Match not found.');
    });

    it('should return error when player not in match', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);

      const result = await checkInPlayer('match-123', 'discord-999');

      expect(result.success).toBe(false);
      expect(result.message).toBe('You are not a participant in this match.');
    });

    it('should return error when already checked in (pre-validation)', async () => {
      const matchWithCheckedIn = {
        ...mockMatch,
        players: [
          { ...mockMatch.players[0], isCheckedIn: true },
          mockMatch.players[1],
        ],
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchWithCheckedIn as unknown);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('You have already checked in!');
    });

    it('should return error when concurrent check-in detected (optimistic lock)', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);
      // Transaction mock simulates concurrent check-in (updateMany returns 0)
      setupTransactionMock(prisma, {
        matchPlayer: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // Already checked in
          count: vi.fn().mockResolvedValue(1),
        },
      });

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('You have already checked in!');
    });

    it('should return error when deadline passed', async () => {
      const matchDeadlinePassed = {
        ...mockMatch,
        checkInDeadline: new Date(Date.now() - 1000), // 1 second ago
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchDeadlinePassed as unknown);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Check-in deadline has passed.');
    });

    it('should return error when match not in CALLED state', async () => {
      const matchNotCalled = {
        ...mockMatch,
        state: 'NOT_STARTED',
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchNotCalled as unknown);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Check-in is not available for this match.');
    });
  });

  describe('getMatchStatus', () => {
    const mockMatch = {
      id: 'match-123',
      identifier: 'WF1',
      roundText: 'Winners Finals',
      state: 'CALLED',
      discordThreadId: 'thread-123',
      checkInDeadline: new Date('2026-01-28T12:00:00Z'),
      players: [
        {
          id: 'player-1',
          playerName: 'Player1',
          isCheckedIn: true,
          checkedInAt: new Date('2026-01-28T11:50:00Z'),
          user: { discordId: 'discord-111' },
        },
        {
          id: 'player-2',
          playerName: 'Player2',
          isCheckedIn: false,
          checkedInAt: null,
          user: { discordId: 'discord-222' },
        },
      ],
    };

    it('should return match status with player info', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as unknown);

      const result = await getMatchStatus('match-123');

      expect(result).toEqual({
        id: 'match-123',
        identifier: 'WF1',
        roundText: 'Winners Finals',
        state: 'CALLED',
        discordThreadId: 'thread-123',
        checkInDeadline: mockMatch.checkInDeadline,
        players: [
          {
            id: 'player-1',
            playerName: 'Player1',
            isCheckedIn: true,
            checkedInAt: mockMatch.players[0].checkedInAt,
            discordId: 'discord-111',
          },
          {
            id: 'player-2',
            playerName: 'Player2',
            isCheckedIn: false,
            checkedInAt: null,
            discordId: 'discord-222',
          },
        ],
      });
    });

    it('should return null when match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await getMatchStatus('match-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPlayerMatches', () => {
    const mockMatches = [
      {
        id: 'match-1',
        identifier: 'WF1',
        roundText: 'Winners Finals',
        state: 'CHECKED_IN',
        discordThreadId: 'thread-1',
        checkInDeadline: null,
        players: [
          { id: 'p1', playerName: 'Player1', isCheckedIn: true, checkedInAt: new Date(), user: { discordId: 'discord-111' } },
          { id: 'p2', playerName: 'Player2', isCheckedIn: true, checkedInAt: new Date(), user: { discordId: 'discord-222' } },
        ],
      },
      {
        id: 'match-2',
        identifier: 'GF1',
        roundText: 'Grand Finals',
        state: 'CALLED',
        discordThreadId: 'thread-2',
        checkInDeadline: new Date(),
        players: [
          { id: 'p3', playerName: 'Player1', isCheckedIn: false, checkedInAt: null, user: { discordId: 'discord-111' } },
          { id: 'p4', playerName: 'Player3', isCheckedIn: false, checkedInAt: null, user: { discordId: 'discord-333' } },
        ],
      },
    ];

    it('should return matches for player', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValue(mockMatches as unknown);

      const result = await getPlayerMatches('discord-111');

      expect(result).toHaveLength(2);
      expect(result[0].identifier).toBe('WF1');
      expect(result[1].identifier).toBe('GF1');
    });

    it('should filter by state when provided', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValue([mockMatches[1]] as unknown);

      const result = await getPlayerMatches('discord-111', { state: 'CALLED' });

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: 'CALLED',
          }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should respect limit option', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValue([mockMatches[0]] as unknown);

      await getPlayerMatches('discord-111', { limit: 1 });

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        })
      );
    });

    it('should return empty array when no matches found', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);

      const result = await getPlayerMatches('discord-999');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Score Reporting Tests
  // ============================================================================

  describe('reportScore', () => {
    const mockMatchCheckedIn = {
      id: 'match-123',
      identifier: 'WF1',
      roundText: 'Winners Finals',
      state: 'CHECKED_IN',
      startggSetId: 'set-456',
      discordThreadId: 'thread-123',
      checkInDeadline: null,
      eventId: 'event-789',
      event: {
        id: 'event-789',
        tournament: {
          id: 'tournament-abc',
          discordChannelId: 'channel-123',
        },
      },
      players: [
        {
          id: 'player-1',
          playerName: 'Player1',
          isCheckedIn: true,
          checkedInAt: new Date(),
          startggEntrantId: 'entrant-1',
          isWinner: null,
          user: { id: 'user-1', discordId: 'discord-111' },
        },
        {
          id: 'player-2',
          playerName: 'Player2',
          isCheckedIn: true,
          checkedInAt: new Date(),
          startggEntrantId: 'entrant-2',
          isWinner: null,
          user: { id: 'user-2', discordId: 'discord-222' },
        },
      ],
    };

    beforeEach(() => {
      // Mock dynamic import for Start.gg client
      vi.mock('@fightrise/startgg-client', () => ({
        StartGGClient: vi.fn().mockImplementation(() => ({
          reportSet: vi.fn().mockResolvedValue({ id: 'set-456', state: 3 }),
        })),
      }));
    });

    it('should auto-complete when loser confirms opponent won', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchCheckedIn as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({}),
        },
      });

      // Player 1 (discord-111) reports Player 2 (slot 2) won = loser confirming
      const result = await reportScore('match-123', 'discord-111', 2);

      expect(result.success).toBe(true);
      expect(result.autoCompleted).toBe(true);
      expect(result.message).toContain('Player2 wins');
      expect(result.matchStatus?.state).toBe('COMPLETED');
    });

    it('should go to pending confirmation when winner self-reports', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchCheckedIn as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({}),
        },
      });

      // Player 1 (discord-111) reports Player 1 (slot 1) won = self-report
      const result = await reportScore('match-123', 'discord-111', 1);

      expect(result.success).toBe(true);
      expect(result.autoCompleted).toBe(false);
      expect(result.message).toContain('Waiting for Player2 to confirm');
      expect(result.matchStatus?.state).toBe('PENDING_CONFIRMATION');
    });

    it('should return error when match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await reportScore('match-nonexistent', 'discord-111', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Match not found.');
    });

    it('should return error when player not in match', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchCheckedIn as unknown);

      const result = await reportScore('match-123', 'discord-999', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You are not a participant in this match.');
    });

    it('should return error when match already completed', async () => {
      const completedMatch = { ...mockMatchCheckedIn, state: 'COMPLETED' };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(completedMatch as unknown);

      const result = await reportScore('match-123', 'discord-111', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('This match has already been completed.');
    });

    it('should return error when match already has pending confirmation', async () => {
      const pendingMatch = { ...mockMatchCheckedIn, state: 'PENDING_CONFIRMATION' };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(pendingMatch as unknown);

      const result = await reportScore('match-123', 'discord-111', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('A result has already been reported. Waiting for confirmation.');
    });

    it('should return error when match not in CHECKED_IN state', async () => {
      const calledMatch = { ...mockMatchCheckedIn, state: 'CALLED' };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(calledMatch as unknown);

      const result = await reportScore('match-123', 'discord-111', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Score reporting is not available for this match.');
    });

    it('should return error for invalid winner slot', async () => {
      const result = await reportScore('match-123', 'discord-111', 3);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid winner selection.');
    });

    it('should handle concurrent report (state guard)', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchCheckedIn as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // State already changed
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({}),
        },
      });

      const result = await reportScore('match-123', 'discord-111', 1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Match state changed. Please try again.');
    });
  });

  describe('confirmResult', () => {
    const mockMatchPending = {
      id: 'match-123',
      identifier: 'WF1',
      roundText: 'Winners Finals',
      state: 'PENDING_CONFIRMATION',
      startggSetId: 'set-456',
      discordThreadId: 'thread-123',
      checkInDeadline: null,
      players: [
        {
          id: 'player-1',
          playerName: 'Player1',
          isCheckedIn: true,
          checkedInAt: new Date(),
          startggEntrantId: 'entrant-1',
          isWinner: true, // Player 1 self-reported as winner
          user: { id: 'user-1', discordId: 'discord-111' },
        },
        {
          id: 'player-2',
          playerName: 'Player2',
          isCheckedIn: true,
          checkedInAt: new Date(),
          startggEntrantId: 'entrant-2',
          isWinner: null,
          user: { id: 'user-2', discordId: 'discord-222' },
        },
      ],
    };

    it('should complete match when opponent confirms', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchPending as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({}),
        },
      });

      // Player 2 (discord-222) confirms Player 1's self-report
      const result = await confirmResult('match-123', 'discord-222', true);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Player1 wins');
      expect(result.matchStatus?.state).toBe('COMPLETED');
    });

    it('should reset state and return dispute message when opponent disputes', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchPending as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      });

      // Player 2 (discord-222) disputes Player 1's self-report
      const result = await confirmResult('match-123', 'discord-222', false);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Result disputed. Please report the correct winner.');
      expect(result.matchStatus?.state).toBe('CHECKED_IN');
    });

    it('should return error when reporter tries to confirm their own report', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchPending as unknown);

      // Player 1 (discord-111) tries to confirm their own report
      const result = await confirmResult('match-123', 'discord-111', true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You cannot confirm your own report.');
    });

    it('should return error when match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await confirmResult('match-nonexistent', 'discord-222', true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Match not found.');
    });

    it('should return error when match not pending confirmation', async () => {
      const checkedInMatch = { ...mockMatchPending, state: 'CHECKED_IN' };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(checkedInMatch as unknown);

      const result = await confirmResult('match-123', 'discord-222', true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No result pending confirmation.');
    });

    it('should return error when match already completed', async () => {
      const completedMatch = { ...mockMatchPending, state: 'COMPLETED' };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(completedMatch as unknown);

      const result = await confirmResult('match-123', 'discord-222', true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('This match has already been completed.');
    });

    it('should return error when user not in match', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchPending as unknown);

      const result = await confirmResult('match-123', 'discord-999', true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('You are not a participant in this match.');
    });

    it('should handle concurrent confirm (state guard)', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchPending as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // Already transitioned
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({}),
        },
      });

      const result = await confirmResult('match-123', 'discord-222', true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Match state changed. Please try again.');
    });

    it('should reset state to CHECKED_IN when disputed', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchPending as unknown);
      setupTransactionMock(prisma, {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      });

      // Player 2 disputes
      const result = await confirmResult('match-123', 'discord-222', false);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Result disputed. Please report the correct winner.');
      expect(result.matchStatus?.state).toBe('CHECKED_IN');
      // Winner flags should be cleared
      result.matchStatus?.players.forEach((p) => {
        expect(p.isWinner).toBeNull();
      });
    });
  });
});
