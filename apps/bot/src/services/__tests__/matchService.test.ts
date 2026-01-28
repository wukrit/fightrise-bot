import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChannelType } from 'discord.js';

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
      count: vi.fn(),
    },
  },
  MatchState: {
    NOT_STARTED: 'NOT_STARTED',
    CALLED: 'CALLED',
    CHECKED_IN: 'CHECKED_IN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
  Prisma: {},
}));

// Mock the shared package
vi.mock('@fightrise/shared', () => ({
  createInteractionId: vi.fn((...parts: string[]) => parts.join(':')),
  INTERACTION_PREFIX: {
    CHECK_IN: 'checkin',
  },
}));

import { prisma } from '@fightrise/database';
import {
  createMatchThread,
  formatThreadName,
  checkInPlayer,
  getMatchStatus,
  getPlayerMatches,
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
  // Mock Discord client
  let mockClient: {
    channels: {
      fetch: ReturnType<typeof vi.fn>;
    };
  };

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
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as never);

      const result = await createMatchThread(mockClient as never, 'match-123');

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

      const result = await createMatchThread(mockClient as never, 'match-nonexistent');

      expect(result).toBeNull();
      expect(prisma.match.updateMany).not.toHaveBeenCalled();
    });

    it('should return existing thread ID when match already has thread (idempotency)', async () => {
      const matchWithThread = {
        ...mockMatch,
        discordThreadId: 'existing-thread-456',
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchWithThread as never);

      const result = await createMatchThread(mockClient as never, 'match-123');

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
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchNoChannel as never);

      const result = await createMatchThread(mockClient as never, 'match-123');

      expect(result).toBeNull();
    });

    it('should return null when channel fetch fails', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      mockClient.channels.fetch.mockRejectedValue(new Error('Channel not found'));

      const result = await createMatchThread(mockClient as never, 'match-123');

      expect(result).toBeNull();
    });

    it('should return null when channel is wrong type', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      mockClient.channels.fetch.mockResolvedValue({
        type: ChannelType.GuildVoice, // Wrong type
      });

      const result = await createMatchThread(mockClient as never, 'match-123');

      expect(result).toBeNull();
    });

    it('should continue when player add fails', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as never);

      // Override channel mock to have member add fail
      mockClient.channels.fetch.mockResolvedValue({
        type: ChannelType.GuildText,
        threads: {
          create: vi.fn().mockResolvedValue(
            createMockThread('thread-new-123', 'Winners Finals (WF1): Player1 vs Player2', false)
          ),
        },
      });

      const result = await createMatchThread(mockClient as never, 'match-123');

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
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchNoCheckIn as never);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as never);

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

      const result = await createMatchThread(mockClient as never, 'match-123');

      expect(result).toBe('thread-new-123');
      expect(sentComponents).toHaveLength(0); // No buttons when check-in disabled
    });

    it('should set checkInDeadline when requireCheckIn is true', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 } as never);

      await createMatchThread(mockClient as never, 'match-123');

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
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchOnePlayer as never);

      const result = await createMatchThread(mockClient as never, 'match-123');

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
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      vi.mocked(prisma.matchPlayer.update).mockResolvedValue({} as never);
      vi.mocked(prisma.matchPlayer.count).mockResolvedValue(1 as never);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Checked in! Waiting for your opponent.');
      expect(result.bothCheckedIn).toBe(false);
      expect(prisma.matchPlayer.update).toHaveBeenCalledWith({
        where: { id: 'player-1' },
        data: { isCheckedIn: true, checkedInAt: expect.any(Date) },
      });
    });

    it('should return both checked in when both players are ready', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
      vi.mocked(prisma.matchPlayer.update).mockResolvedValue({} as never);
      vi.mocked(prisma.matchPlayer.count).mockResolvedValue(2 as never);
      vi.mocked(prisma.match.update).mockResolvedValue({} as never);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Checked in! Both players are ready - match can begin!');
      expect(result.bothCheckedIn).toBe(true);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'match-123' },
        data: { state: 'CHECKED_IN' },
      });
    });

    it('should return error when match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Match not found.');
    });

    it('should return error when player not in match', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);

      const result = await checkInPlayer('match-123', 'discord-999');

      expect(result.success).toBe(false);
      expect(result.message).toBe('You are not a participant in this match.');
    });

    it('should return error when already checked in', async () => {
      const matchWithCheckedIn = {
        ...mockMatch,
        players: [
          { ...mockMatch.players[0], isCheckedIn: true },
          mockMatch.players[1],
        ],
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchWithCheckedIn as never);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('You have already checked in!');
    });

    it('should return error when deadline passed', async () => {
      const matchDeadlinePassed = {
        ...mockMatch,
        checkInDeadline: new Date(Date.now() - 1000), // 1 second ago
      };
      vi.mocked(prisma.match.findUnique).mockResolvedValue(matchDeadlinePassed as never);

      const result = await checkInPlayer('match-123', 'discord-111');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Check-in deadline has passed.');
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
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);

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
      vi.mocked(prisma.match.findMany).mockResolvedValue(mockMatches as never);

      const result = await getPlayerMatches('discord-111');

      expect(result).toHaveLength(2);
      expect(result[0].identifier).toBe('WF1');
      expect(result[1].identifier).toBe('GF1');
    });

    it('should filter by state when provided', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValue([mockMatches[1]] as never);

      const result = await getPlayerMatches('discord-111', { state: 'CALLED' as never });

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
      vi.mocked(prisma.match.findMany).mockResolvedValue([mockMatches[0]] as never);

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
});
