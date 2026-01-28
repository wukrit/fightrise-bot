import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the service before imports
vi.mock('../../services/matchService.js', () => ({
  checkInPlayer: vi.fn(),
}));

// Mock the shared package
vi.mock('@fightrise/shared', () => ({
  INTERACTION_PREFIX: {
    CHECK_IN: 'checkin',
  },
}));

import { checkInPlayer } from '../../services/matchService.js';
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

  it('should delegate to checkInPlayer service and reply with result', async () => {
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Waiting for your opponent.',
      bothCheckedIn: false,
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
  });

  it('should return both checked in message when both players are ready', async () => {
    vi.mocked(checkInPlayer).mockResolvedValue({
      success: true,
      message: 'Checked in! Both players are ready - match can begin!',
      bothCheckedIn: true,
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '1']);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'Checked in! Both players are ready - match can begin!',
      ephemeral: true,
    });
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
    });

    await checkinHandler.execute(mockInteraction as never, ['match-123', '2']);

    expect(checkInPlayer).toHaveBeenCalledWith('match-123', 'discord-222');
  });
});
