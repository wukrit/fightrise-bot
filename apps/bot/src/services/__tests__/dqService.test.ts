import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the database before imports
vi.mock('@fightrise/database', () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    matchPlayer: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        match: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        matchPlayer: {
          update: vi.fn().mockResolvedValue({ id: 'player-123' }),
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
    DQ: 'DQ',
  },
  AuditAction: {
    PLAYER_DQ: 'PLAYER_DQ',
  },
  AuditSource: {
    DISCORD: 'DISCORD',
  },
  Prisma: {},
}));

// Mock the auditService
vi.mock('../auditService.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

import { prisma } from '@fightrise/database';
import { dqPlayer } from '../dqService.js';
import { createAuditLog } from '../auditService.js';

describe('dqService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockMatch = {
    id: 'match-123',
    identifier: 'WF1',
    state: 'NOT_STARTED' as const,
    players: [
      { id: 'player-1', playerName: 'PlayerOne', isWinner: null },
      { id: 'player-2', playerName: 'PlayerTwo', isWinner: null },
    ],
    event: {
      tournament: { id: 'tournament-1' },
    },
  };

  describe('dqPlayer', () => {
    it('should DQ player and award win to opponent', async () => {
      // Arrange
      const mockMatchWithPlayers = {
        ...mockMatch,
        players: [
          { id: 'player-1', playerName: 'PlayerOne', isWinner: null, user: { discordId: 'discord-1' } },
          { id: 'player-2', playerName: 'PlayerTwo', isWinner: null, user: { discordId: 'discord-2' } },
        ],
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchWithPlayers as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'admin-user-1' } as any);

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('PlayerOne has been disqualified');
      expect(result.message).toContain('PlayerTwo wins by default');
    });

    it('should return error if match not found', async () => {
      // Arrange
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      // Act
      const result = await dqPlayer('non-existent-match', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Match not found.');
    });

    it('should return error if match already completed', async () => {
      // Arrange
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        ...mockMatch,
        state: 'COMPLETED' as const,
      } as any);

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Match is already completed.');
    });

    it('should return error if match already DQd', async () => {
      // Arrange
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        ...mockMatch,
        state: 'DQ' as const,
      } as any);

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Match is already completed.');
    });

    it('should return error if player not found in match', async () => {
      // Arrange
      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch as any);

      // Act
      const result = await dqPlayer('match-123', 'non-existent-player', 'No-show');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Player not found in match.');
    });

    it('should return error if no opponent found', async () => {
      // Arrange
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        ...mockMatch,
        players: [{ id: 'player-1', playerName: 'PlayerOne', isWinner: null }],
      } as any);

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('No opponent found.');
    });

    it('should create audit log when adminId is provided', async () => {
      // Arrange
      const mockMatchWithPlayers = {
        ...mockMatch,
        players: [
          { id: 'player-1', playerName: 'PlayerOne', isWinner: null, user: { discordId: 'discord-1' } },
          { id: 'player-2', playerName: 'PlayerTwo', isWinner: null, user: { discordId: 'discord-2' } },
        ],
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchWithPlayers as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'admin-user-1' } as any);

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'Violation of rules', 'admin-discord-123');

      // Assert
      expect(result.success).toBe(true);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PLAYER_DQ',
          entityType: 'Match',
          entityId: 'match-123',
          userId: 'admin-user-1',
          reason: 'Violation of rules',
          source: 'DISCORD',
        })
      );
    });

    it('should not create audit log when adminId is not provided', async () => {
      // Arrange
      const mockMatchWithPlayers = {
        ...mockMatch,
        players: [
          { id: 'player-1', playerName: 'PlayerOne', isWinner: null, user: { discordId: 'discord-1' } },
          { id: 'player-2', playerName: 'PlayerTwo', isWinner: null, user: { discordId: 'discord-2' } },
        ],
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchWithPlayers as any);

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(true);
      expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('should handle idempotency - concurrent DQ attempts', async () => {
      // Arrange
      const mockMatchWithPlayers = {
        ...mockMatch,
        players: [
          { id: 'player-1', playerName: 'PlayerOne', isWinner: null, user: { discordId: 'discord-1' } },
          { id: 'player-2', playerName: 'PlayerTwo', isWinner: null, user: { discordId: 'discord-2' } },
        ],
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchWithPlayers as any);

      // Mock transaction to fail on concurrent update (simulating race condition)
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        throw new Error('Match has already been completed or DQd');
      });

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'No-show');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Match has already been completed or DQd.');
    });

    it('should handle case when admin user is not found', async () => {
      // Arrange
      const mockMatchWithPlayers = {
        ...mockMatch,
        players: [
          { id: 'player-1', playerName: 'PlayerOne', isWinner: null, user: { discordId: 'discord-1' } },
          { id: 'player-2', playerName: 'PlayerTwo', isWinner: null, user: { discordId: 'discord-2' } },
        ],
      };

      vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatchWithPlayers as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // Admin not found

      // Act
      const result = await dqPlayer('match-123', 'player-1', 'Violation', 'unknown-admin');

      // Assert
      expect(result.success).toBe(true);
      // Audit log should not be called when admin user is not found
      expect(createAuditLog).not.toHaveBeenCalled();
    });
  });
});
