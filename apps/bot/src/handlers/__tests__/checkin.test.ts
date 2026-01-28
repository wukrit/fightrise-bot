import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the database before imports
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    matchPlayer: {
      update: vi.fn(),
    },
  },
  MatchState: {
    NOT_STARTED: 'NOT_STARTED',
    CALLED: 'CALLED',
    CHECKED_IN: 'CHECKED_IN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
  },
}));

// Mock the shared package
vi.mock('@fightrise/shared', () => ({
  INTERACTION_PREFIX: {
    CHECK_IN: 'checkin',
  },
}));

import { prisma } from '@fightrise/database';
import { checkinHandler } from '../checkin.js';

describe('checkinHandler', () => {
  // Mock button interaction
  let mockInteraction: {
    user: { id: string };
    customId: string;
    reply: ReturnType<typeof vi.fn>;
    replied: boolean;
    deferred: boolean;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = {
      user: { id: 'discord-111' },
      customId: 'checkin:match-123:1',
      reply: vi.fn().mockResolvedValue(undefined),
      replied: false,
      deferred: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
        user: {
          id: 'user-1',
          discordId: 'discord-111',
        },
      },
      {
        id: 'player-2',
        playerName: 'Player2',
        isCheckedIn: false,
        checkedInAt: null,
        user: {
          id: 'user-2',
          discordId: 'discord-222',
        },
      },
    ],
  };

  it('should update player check-in status when correct player clicks', async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
    vi.mocked(prisma.matchPlayer.update).mockResolvedValue({} as never);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.matchPlayer.update).toHaveBeenCalledWith({
      where: { id: 'player-1' },
      data: {
        isCheckedIn: true,
        checkedInAt: expect.any(Date),
      },
    });
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Checked in! Waiting for your opponent.',
      ephemeral: true,
    });
  });

  it('should reject when wrong player clicks', async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
    mockInteraction.user.id = 'discord-wrong-user';

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.matchPlayer.update).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'This check-in button is not for you.',
      ephemeral: true,
    });
  });

  it('should reject when match not found', async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.matchPlayer.update).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Match not found.',
      ephemeral: true,
    });
  });

  it('should transition match to CHECKED_IN when both players check in', async () => {
    // Second player already checked in
    const matchWithOneCheckedIn = {
      ...mockMatch,
      players: [
        mockMatch.players[0],
        {
          ...mockMatch.players[1],
          isCheckedIn: true,
          checkedInAt: new Date(),
        },
      ],
    };
    vi.mocked(prisma.match.findUnique).mockResolvedValue(matchWithOneCheckedIn as never);
    vi.mocked(prisma.matchPlayer.update).mockResolvedValue({} as never);
    vi.mocked(prisma.match.update).mockResolvedValue({} as never);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: 'match-123' },
      data: { state: 'CHECKED_IN' },
    });
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Checked in! Both players are ready - match can begin!',
      ephemeral: true,
    });
  });

  it('should reject when player already checked in', async () => {
    const matchWithPlayerCheckedIn = {
      ...mockMatch,
      players: [
        {
          ...mockMatch.players[0],
          isCheckedIn: true,
          checkedInAt: new Date(),
        },
        mockMatch.players[1],
      ],
    };
    vi.mocked(prisma.match.findUnique).mockResolvedValue(matchWithPlayerCheckedIn as never);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.matchPlayer.update).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'You have already checked in!',
      ephemeral: true,
    });
  });

  it('should reject when check-in deadline has passed', async () => {
    const matchDeadlinePassed = {
      ...mockMatch,
      checkInDeadline: new Date(Date.now() - 1000), // 1 second ago
    };
    vi.mocked(prisma.match.findUnique).mockResolvedValue(matchDeadlinePassed as never);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.matchPlayer.update).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Check-in deadline has passed.',
      ephemeral: true,
    });
  });

  it('should reject with invalid player slot', async () => {
    await checkinHandler.execute(mockInteraction as never, ['match-123', '3']);

    expect(prisma.match.findUnique).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Invalid button.',
      ephemeral: true,
    });
  });

  it('should handle player slot 2 correctly', async () => {
    mockInteraction.user.id = 'discord-222'; // Player 2's Discord ID
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as never);
    vi.mocked(prisma.matchPlayer.update).mockResolvedValue({} as never);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '2']);

    expect(prisma.matchPlayer.update).toHaveBeenCalledWith({
      where: { id: 'player-2' },
      data: {
        isCheckedIn: true,
        checkedInAt: expect.any(Date),
      },
    });
  });

  it('should reject when player has no linked Discord account', async () => {
    const matchNoDiscordLink = {
      ...mockMatch,
      players: [
        {
          ...mockMatch.players[0],
          user: null, // No linked user
        },
        mockMatch.players[1],
      ],
    };
    vi.mocked(prisma.match.findUnique).mockResolvedValue(matchNoDiscordLink as never);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(prisma.matchPlayer.update).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'This check-in button is not for you.',
      ephemeral: true,
    });
  });
});
