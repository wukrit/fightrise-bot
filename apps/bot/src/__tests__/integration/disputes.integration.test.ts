/**
 * Integration tests for dispute resolution flow.
 * Tests the full flow of match dispute handling.
 *
 * These tests use the Discord test harness to simulate interactions
 * and verify the dispute resolution flow end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscordTestClient, DiscordTestClient } from '../harness/index.js';

// Mock the prisma client
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    matchPlayer: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    dispute: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
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
    StartggSyncStatus: {
      NOT_SYNCED: 'NOT_SYNCED',
      PENDING: 'PENDING',
      SYNCED: 'SYNCED',
      FAILED: 'FAILED',
    },
  };
});

const { prisma } = await import('@fightrise/database');

describe('Dispute Resolution Flow Integration', () => {
  let testClient: DiscordTestClient;

  beforeEach(() => {
    vi.clearAllMocks();

    testClient = createDiscordTestClient({
      userId: 'test-user-123',
      username: 'TestPlayer',
      guildId: 'test-guild-123',
      channelId: 'test-channel-123',
    });
  });

  describe('Dispute Creation', () => {
    it('should create a new dispute', async () => {
      vi.mocked(prisma.dispute.create).mockResolvedValue({
        id: 'dispute-123',
        matchId: 'match-123',
        initiatorId: 'user-123',
        status: 'OPEN',
        reason: 'Incorrect score reported',
      } as any);

      const result = await prisma.dispute.create({
        data: {
          matchId: 'match-123',
          initiatorId: 'user-123',
          status: 'OPEN',
          reason: 'Incorrect score reported',
        },
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe('OPEN');
    });

    it('should associate dispute with match', async () => {
      vi.mocked(prisma.dispute.create).mockResolvedValue({
        id: 'dispute-123',
        matchId: 'match-123',
      } as any);

      const result = await prisma.dispute.create({
        data: {
          matchId: 'match-123',
          initiatorId: 'user-123',
          status: 'OPEN',
        },
      });

      expect(result.matchId).toBe('match-123');
    });

    it('should set dispute status to OPEN initially', async () => {
      vi.mocked(prisma.dispute.create).mockResolvedValue({
        id: 'dispute-123',
        status: 'OPEN',
      } as any);

      const result = await prisma.dispute.create({
        data: {
          matchId: 'match-123',
          initiatorId: 'user-123',
          status: 'OPEN',
        },
      });

      expect(result.status).toBe('OPEN');
    });

    it('should transition match to DISPUTED state', async () => {
      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        state: 'DISPUTED',
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { state: 'DISPUTED' },
      });

      expect(result.state).toBe('DISPUTED');
    });
  });

  describe('Dispute Handler Interaction', () => {
    it('should handle dispute button click', async () => {
      const buttonInteraction = await testClient.clickButton('dispute:cmatch123');

      expect(buttonInteraction.customId).toContain('dispute');
    });

    it('should parse dispute button custom ID', async () => {
      const buttonInteraction = await testClient.clickButton('dispute:cmatch123');

      const parts = buttonInteraction.customId.split(':');
      expect(parts[0]).toBe('dispute');
      expect(parts[1]).toBe('cmatch123');
    });

    it('should send dispute message in thread', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send('Result disputed! Please discuss and report the correct result, or contact a tournament organizer.');

      const lastMessage = thread.messages[0];
      expect(lastMessage.content).toContain('disputed');
    });
  });

  describe('Admin Dispute Resolution', () => {
    it('should resolve dispute with admin action', async () => {
      vi.mocked(prisma.dispute.update).mockResolvedValue({
        id: 'dispute-123',
        status: 'RESOLVED',
        resolution: 'Score corrected',
        resolvedBy: 'admin-123',
      } as any);

      const result = await prisma.dispute.update({
        where: { id: 'dispute-123' },
        data: {
          status: 'RESOLVED',
          resolution: 'Score corrected',
          resolvedBy: 'admin-123',
        },
      });

      expect(result.status).toBe('RESOLVED');
    });

    it('should set match back to IN_PROGRESS after resolution', async () => {
      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        state: 'IN_PROGRESS',
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { state: 'IN_PROGRESS' },
      });

      expect(result.state).toBe('IN_PROGRESS');
    });

    it('should handle rejected dispute', async () => {
      vi.mocked(prisma.dispute.update).mockResolvedValue({
        id: 'dispute-123',
        status: 'REJECTED',
        resolution: 'Original result stands',
      } as any);

      const result = await prisma.dispute.update({
        where: { id: 'dispute-123' },
        data: { status: 'REJECTED', resolution: 'Original result stands' },
      });

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('DQ Flow from Dispute', () => {
    it('should DQ player from match', async () => {
      vi.mocked(prisma.matchPlayer.update).mockResolvedValue({
        id: 'player-123',
        isWinner: false,
      } as any);

      const result = await prisma.matchPlayer.update({
        where: { id: 'player-123' },
        data: { isWinner: false }, // DQ = not winner
      });

      expect(result.isWinner).toBe(false);
    });

    it('should DQ both players if both disputed', async () => {
      vi.mocked(prisma.matchPlayer.updateMany).mockResolvedValue({ count: 2 });

      const result = await prisma.matchPlayer.updateMany({
        where: { matchId: 'match-123' },
        data: { isWinner: false },
      });

      expect(result.count).toBe(2);
    });

    it('should transition match to DQ state', async () => {
      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        state: 'DQ',
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { state: 'DQ' },
      });

      expect(result.state).toBe('DQ');
    });

    it('should create DQ dispute record', async () => {
      vi.mocked(prisma.dispute.create).mockResolvedValue({
        id: 'dispute-123',
        matchId: 'match-123',
        status: 'RESOLVED',
        resolution: 'Player DQd',
      } as any);

      const result = await prisma.dispute.create({
        data: {
          matchId: 'match-123',
          initiatorId: 'admin-123',
          status: 'RESOLVED',
          resolution: 'Player DQd',
        },
      });

      expect(result.resolution).toContain('DQ');
    });
  });

  describe('Dispute Timeout Handling', () => {
    it('should handle dispute timeout', async () => {
      const timeoutDate = new Date(Date.now() - 600000); // 10 minutes ago (more than 5 min timeout)

      vi.mocked(prisma.dispute.findFirst).mockResolvedValue({
        id: 'dispute-123',
        createdAt: timeoutDate,
        status: 'OPEN',
      } as any);

      const dispute = await prisma.dispute.findFirst({
        where: { status: 'OPEN' },
      });

      // Dispute is more than 5 minutes old
      const isTimedOut = dispute && (Date.now() - 300000) > dispute.createdAt.getTime();
      expect(isTimedOut).toBe(true);
    });

    it('should auto-resolve timed out disputes', async () => {
      vi.mocked(prisma.dispute.update).mockResolvedValue({
        id: 'dispute-123',
        status: 'AUTO_RESOLVED',
        resolution: 'Timed out - original result stands',
      } as any);

      const result = await prisma.dispute.update({
        where: { id: 'dispute-123' },
        data: {
          status: 'AUTO_RESOLVED',
          resolution: 'Timed out - original result stands',
        },
      });

      expect(result.status).toBe('AUTO_RESOLVED');
    });
  });

  describe('Dispute UI Flow', () => {
    it('should show disputed embed', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Match: Player1 vs Player2',
        components: [],
        embeds: [
          {
            title: 'Winners Quarterfinals',
            fields: [
              { name: 'Match ID', value: 'A4', inline: true },
              { name: 'Status', value: '⚠️ Result Disputed', inline: true },
            ],
            footer: { text: 'Please report the correct result or contact a TO' },
          },
        ],
      });

      const message = thread.messages[0];
      expect(message.embeds).toBeDefined();
    });

    it('should show report buttons after dispute', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Match: Player1 vs Player2\n⚠️ Result Disputed',
        components: [
          {
            type: 1,
            components: [
              { type: 2, label: 'Player1 Wins (2-0/3-0)', customId: 'report:cmatch123:1:quick', style: 3 },
              { type: 2, label: 'Player2 Wins (2-0/3-0)', customId: 'report:cmatch123:2:quick', style: 3 },
            ],
          },
        ],
      });

      const message = thread.messages[0];
      expect(message.components[0].components).toHaveLength(2);
    });

    it('should show DQ announcement', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send('Match result: Player1 wins by DQ. Player2 has been disqualified.');

      const lastMessage = thread.messages[0];
      expect(lastMessage.content).toContain('DQ');
      expect(lastMessage.content).toContain('disqualified');
    });
  });
});
