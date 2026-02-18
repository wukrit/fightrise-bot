import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkInPlayer } from '../checkin.js';

vi.mock('@fightrise/database', () => ({
  prisma: {
    matchPlayer: {
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    match: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../services/matchService.js', () => ({
  createMatchThread: vi.fn(),
}));

describe('checkin handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check in a player successfully', async () => {
    const { prisma } = await import('@fightrise/database');

    vi.mocked(prisma.matchPlayer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.matchPlayer.count).mockResolvedValue(1);
    vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 });

    const result = await checkInPlayer({
      matchId: 'test-match-id',
      playerId: 'test-player-id',
    });

    expect(result.success).toBe(true);
  });

  it('should reject if player already checked in', async () => {
    const { prisma } = await import('@fightrise/database');

    vi.mocked(prisma.matchPlayer.updateMany).mockResolvedValue({ count: 0 });

    const result = await checkInPlayer({
      matchId: 'test-match-id',
      playerId: 'test-player-id',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('already checked in');
  });

  it('should validate match ID format', async () => {
    const result = await checkInPlayer({
      matchId: 'invalid-id',
      playerId: 'test-player-id',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid');
  });
});
