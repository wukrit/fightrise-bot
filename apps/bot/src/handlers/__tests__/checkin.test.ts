import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MatchState } from '@fightrise/database';
import type { MatchStatus } from '../../services/matchService.js';

// Mock the service before imports
vi.mock('../../services/matchService.js', () => ({
  checkInPlayer: vi.fn(),
}));

// Mock the shared package
vi.mock('@fightrise/shared', () => ({
  INTERACTION_PREFIX: {
    CHECK_IN: 'checkin',
    REPORT: 'report',
  },
  DISCORD_COLORS: {
    SUCCESS: 0x57f287,
    BLURPLE: 0x5865f2,
  },
  createInteractionId: (prefix: string, ...parts: string[]) =>
    [prefix, ...parts].join(':'),
}));

// Mock discord.js with proper chaining support
vi.mock('discord.js', () => {
  // Create a self-returning mock for method chaining
  const createChainableMock = () => {
    const obj: Record<string, unknown> = {};
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (_target, prop) => {
        if (prop === 'then') return undefined; // Not a promise
        return () => new Proxy(obj, handler); // Return chainable mock
      },
    };
    return new Proxy(obj, handler);
  };

  return {
    EmbedBuilder: class {
      constructor() {
        return createChainableMock();
      }
    },
    ActionRowBuilder: class {
      constructor() {
        return createChainableMock();
      }
    },
    ButtonBuilder: class {
      constructor() {
        return createChainableMock();
      }
    },
    ButtonStyle: {
      Success: 3,
      Primary: 1,
    },
  };
});

import { checkInPlayer } from '../../services/matchService.js';
import { checkinHandler } from '../checkin.js';

// Mock match status data
const mockMatchStatus: MatchStatus = {
  id: 'match-123',
  identifier: 'A1',
  roundText: 'Winners Round 1',
  state: MatchState.CALLED,
  discordThreadId: 'thread-123',
  checkInDeadline: new Date(Date.now() + 600000),
  players: [
    {
      id: 'player-1',
      playerName: 'Player One',
      isCheckedIn: true,
      checkedInAt: new Date(),
      discordId: 'discord-111',
    },
    {
      id: 'player-2',
      playerName: 'Player Two',
      isCheckedIn: false,
      checkedInAt: null,
      discordId: 'discord-222',
    },
  ],
};

describe('checkinHandler', () => {
  // Mock button interaction
  let mockInteraction: {
    user: { id: string };
    customId: string;
    reply: ReturnType<typeof vi.fn>;
    replied: boolean;
    deferred: boolean;
    message: {
      edit: ReturnType<typeof vi.fn>;
    };
    channel: {
      isThread: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
    } | null;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = {
      user: { id: 'discord-111' },
      customId: 'checkin:match-123:1',
      reply: vi.fn().mockResolvedValue(undefined),
      replied: false,
      deferred: false,
      message: {
        edit: vi.fn().mockResolvedValue(undefined),
      },
      channel: {
        isThread: vi.fn().mockReturnValue(true),
        send: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delegate to checkInPlayer service and reply with result', async () => {
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Waiting for your opponent.',
      bothCheckedIn: false,
      matchStatus: mockMatchStatus,
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(checkInPlayer).toHaveBeenCalledWith('match-123', 'discord-111');
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Checked in! Waiting for your opponent.',
      ephemeral: true,
    });
  });

  it('should return service error message when check-in fails', async () => {
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: false,
      message: 'Match not found.',
      bothCheckedIn: false,
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Match not found.',
      ephemeral: true,
    });
    // Should not update embed when check-in fails
    expect(mockInteraction.message.edit).not.toHaveBeenCalled();
  });

  it('should update embed with checkmarks on partial check-in', async () => {
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Waiting for your opponent.',
      bothCheckedIn: false,
      matchStatus: mockMatchStatus,
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Checked in! Waiting for your opponent.',
      ephemeral: true,
    });
    expect(mockInteraction.message.edit).toHaveBeenCalled();
    // Should not send announcement on partial check-in
    expect(mockInteraction.channel!.send).not.toHaveBeenCalled();
  });

  it('should replace buttons with score reporting when both players check in', async () => {
    const bothCheckedInStatus: MatchStatus = {
      ...mockMatchStatus,
      state: MatchState.CHECKED_IN,
      players: [
        { ...mockMatchStatus.players[0]!, isCheckedIn: true },
        { ...mockMatchStatus.players[1]!, isCheckedIn: true, checkedInAt: new Date() },
      ],
    };

    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Both players are ready - match can begin!',
      bothCheckedIn: true,
      matchStatus: bothCheckedInStatus,
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Checked in! Both players are ready - match can begin!',
      ephemeral: true,
    });
    expect(mockInteraction.message.edit).toHaveBeenCalled();
    // Should send announcement when both players check in
    expect(mockInteraction.channel!.send).toHaveBeenCalledWith(
      'Match is live! Good luck to both players.'
    );
  });

  it('should not send announcement if channel is not a thread', async () => {
    const bothCheckedInStatus: MatchStatus = {
      ...mockMatchStatus,
      state: MatchState.CHECKED_IN,
      players: [
        { ...mockMatchStatus.players[0]!, isCheckedIn: true },
        { ...mockMatchStatus.players[1]!, isCheckedIn: true, checkedInAt: new Date() },
      ],
    };

    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Both players are ready - match can begin!',
      bothCheckedIn: true,
      matchStatus: bothCheckedInStatus,
    });

    // Set channel.isThread to return false
    mockInteraction.channel!.isThread.mockReturnValue(false);

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(mockInteraction.message.edit).toHaveBeenCalled();
    // Should not send announcement if not in a thread
    expect(mockInteraction.channel!.send).not.toHaveBeenCalled();
  });

  it('should reject with invalid player slot', async () => {
    await checkinHandler.execute(mockInteraction as never, ['match-123', '3']);

    expect(checkInPlayer).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Invalid button.',
      ephemeral: true,
    });
  });

  it('should reject with malformed customId parts (missing matchId)', async () => {
    await checkinHandler.execute(mockInteraction as never, ['', '1']);

    expect(checkInPlayer).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Invalid button format.',
      ephemeral: true,
    });
  });

  it('should reject with malformed customId parts (wrong length)', async () => {
    await checkinHandler.execute(mockInteraction as never, ['match-123']);

    expect(checkInPlayer).not.toHaveBeenCalled();
    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Invalid button format.',
      ephemeral: true,
    });
  });

  it('should handle player slot 2 correctly', async () => {
    mockInteraction.user.id = 'discord-222';
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Waiting for your opponent.',
      bothCheckedIn: false,
      matchStatus: mockMatchStatus,
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '2']);

    expect(checkInPlayer).toHaveBeenCalledWith('match-123', 'discord-222');
  });

  it('should handle null channel gracefully', async () => {
    const bothCheckedInStatus: MatchStatus = {
      ...mockMatchStatus,
      state: MatchState.CHECKED_IN,
      players: [
        { ...mockMatchStatus.players[0]!, isCheckedIn: true },
        { ...mockMatchStatus.players[1]!, isCheckedIn: true, checkedInAt: new Date() },
      ],
    };

    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Both players are ready - match can begin!',
      bothCheckedIn: true,
      matchStatus: bothCheckedInStatus,
    });

    // Set channel to null
    mockInteraction.channel = null;

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    // Should still edit the message
    expect(mockInteraction.message.edit).toHaveBeenCalled();
    // No error should be thrown
  });

  it('should not update embed if matchStatus is undefined', async () => {
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in!',
      bothCheckedIn: false,
      // matchStatus not included
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(mockInteraction.reply).toHaveBeenCalled();
    // Should not attempt to edit if matchStatus is undefined
    expect(mockInteraction.message.edit).not.toHaveBeenCalled();
  });
});
