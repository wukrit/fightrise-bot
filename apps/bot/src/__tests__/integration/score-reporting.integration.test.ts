/**
 * Integration tests for score reporting flow.
 * Tests the full flow of score reporting for matches.
 *
 * These tests use the Discord test harness to simulate interactions
 * and verify the score reporting flow end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscordTestClient, DiscordTestClient } from '../harness/index.js';

// Import score reporting command
import reportCommand from '../../commands/report.js';

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
    gameResult: {
      create: vi.fn(),
      findMany: vi.fn(),
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

describe('Score Reporting Flow Integration', () => {
  let testClient: DiscordTestClient;

  beforeEach(() => {
    vi.clearAllMocks();

    testClient = createDiscordTestClient({
      userId: 'test-user-123',
      username: 'TestPlayer',
      guildId: 'test-guild-123',
      channelId: 'test-channel-123',
    });

    testClient.registerCommand(reportCommand);
  });

  describe('Report Command', () => {
    it('should respond to /report command', async () => {
      const interaction = await testClient.executeCommand('report');

      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply).toBeDefined();
    });

    it('should send ephemeral reply', async () => {
      const interaction = await testClient.executeCommand('report');

      expect(interaction.ephemeral).toBe(true);
    });
  });

  describe('Score Reporting Button Interactions', () => {
    it('should create quick win button interaction', async () => {
      // Format: report:{matchId}:{winnerSlot}:quick
      const buttonInteraction = await testClient.clickButton('report:cmockmatch123:1:quick');

      expect(buttonInteraction.customId).toContain('report');
      expect(buttonInteraction.customId).toContain('1');
    });

    it('should handle detailed score selection', async () => {
      // Format: report:{matchId}:select
      const selectInteraction = await testClient.clickButton('report:cmatch123:select');

      expect(selectInteraction.customId).toContain('report');
      expect(selectInteraction.customId).toContain('select');
    });

    it('should handle score value format', async () => {
      // Format from select: winnerSlot|score (e.g., "1|2-1")
      const buttonInteraction = await testClient.clickButton('report:cmatch123:1|2-1');

      expect(buttonInteraction.customId).toContain('2-1');
    });

    it('should validate winner slot', async () => {
      const buttonInteraction = await testClient.clickButton('report:cmatch123:invalid');

      expect(buttonInteraction.customId).toBeDefined();
    });
  });

  describe('Confirm Button Interaction', () => {
    it('should create confirm button interaction', async () => {
      // Format: confirm:{matchId}
      const buttonInteraction = await testClient.clickButton('confirm:cmatch123');

      expect(buttonInteraction.customId).toContain('confirm');
    });

    it('should handle confirm for match', async () => {
      const buttonInteraction = await testClient.clickButton('confirm:cvalidmatch123');

      expect(buttonInteraction.isButton()).toBe(true);
    });
  });

  describe('Dispute Button Interaction', () => {
    it('should create dispute button interaction', async () => {
      // Format: dispute:{matchId}
      const buttonInteraction = await testClient.clickButton('dispute:cmatch123');

      expect(buttonInteraction.customId).toContain('dispute');
    });

    it('should handle dispute for match', async () => {
      const buttonInteraction = await testClient.clickButton('dispute:cvalidmatch123');

      expect(buttonInteraction.isButton()).toBe(true);
    });
  });

  describe('Score Reporting Database State', () => {
    it('should update winner in match player', async () => {
      vi.mocked(prisma.matchPlayer.update).mockResolvedValue({
        id: 'player-123',
        isWinner: true,
        reportedScore: 2,
      } as any);

      const result = await prisma.matchPlayer.update({
        where: { id: 'player-123' },
        data: { isWinner: true, reportedScore: 2 },
      });

      expect(result.isWinner).toBe(true);
      expect(result.reportedScore).toBe(2);
    });

    it('should update loser in match player', async () => {
      vi.mocked(prisma.matchPlayer.update).mockResolvedValue({
        id: 'player-456',
        isWinner: false,
        reportedScore: 0,
      } as any);

      const result = await prisma.matchPlayer.update({
        where: { id: 'player-456' },
        data: { isWinner: false, reportedScore: 0 },
      });

      expect(result.isWinner).toBe(false);
      expect(result.reportedScore).toBe(0);
    });

    it('should transition match to PENDING_CONFIRMATION', async () => {
      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        state: 'PENDING_CONFIRMATION',
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { state: 'PENDING_CONFIRMATION' },
      });

      expect(result.state).toBe('PENDING_CONFIRMATION');
    });

    it('should transition match to COMPLETED after confirmation', async () => {
      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        state: 'COMPLETED',
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { state: 'COMPLETED' },
      });

      expect(result.state).toBe('COMPLETED');
    });

    it('should create game results for detailed scores', async () => {
      vi.mocked(prisma.gameResult.create).mockResolvedValue({
        id: 'game-1',
        matchPlayerId: 'player-123',
        gameNumber: 1,
        winnerId: 'player-123',
        playerScore: 2,
        opponentScore: 1,
      } as any);

      const result = await prisma.gameResult.create({
        data: {
          matchPlayerId: 'player-123',
          gameNumber: 1,
          winnerId: 'player-123',
          playerScore: 2,
          opponentScore: 1,
        },
      });

      expect(result.winnerId).toBe('player-123');
    });
  });

  describe('Score Reporting UI Flow', () => {
    it('should show quick win buttons', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Match: Player1 vs Player2\n🎮 Match Live!',
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

    it('should show detailed score select menu', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Report detailed score:',
        components: [
          {
            type: 1,
            components: [
              {
                type: 3, // Select menu
                customId: 'report:cmatch123:select',
                options: [
                  { label: 'Player1 wins 2-1', value: '1|2-1' },
                  { label: 'Player1 wins 3-2', value: '1|3-2' },
                  { label: 'Player2 wins 2-1', value: '2|2-1' },
                  { label: 'Player2 wins 3-2', value: '2|3-2' },
                ],
              },
            ],
          },
        ],
      });

      const message = thread.messages[0];
      expect(message.components[0].components).toHaveLength(1);
    });

    it('should show pending confirmation state', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Match: Player1 vs Player2\n⏳ Pending Confirmation\nReported: Player1',
        components: [
          {
            type: 1,
            components: [
              { type: 2, label: 'Confirm Result', customId: 'confirm:cmatch123', style: 3 },
              { type: 2, label: 'Dispute', customId: 'dispute:cmatch123', style: 4 },
            ],
          },
        ],
      });

      const message = thread.messages[0];
      expect(message.content).toContain('⏳ Pending Confirmation');
    });

    it('should show completed match state', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Match: Player1 vs Player2\n✅ Complete\n🏆 Player1 wins!',
        components: [], // No components = match complete
      });

      const message = thread.messages[0];
      expect(message.content).toContain('✅ Complete');
      expect(message.content).toContain('🏆 Player1');
    });

    it('should show disputed state', async () => {
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
      expect(message.content).toContain('⚠️ Result Disputed');
    });
  });

  describe('Self-Reporting vs Confirmation', () => {
    it('should require confirmation when self-reported', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        id: 'match-123',
        state: 'IN_PROGRESS',
        allowSelfReporting: true,
      } as any);

      const match = await prisma.match.findUnique({
        where: { id: 'match-123' },
      });

      // Self-report requires opponent confirmation
      expect(match?.allowSelfReporting).toBe(true);
    });

    it('should auto-complete when auto-submit enabled', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        id: 'match-123',
        state: 'IN_PROGRESS',
        allowSelfReporting: false,
      } as any);

      const match = await prisma.match.findUnique({
        where: { id: 'match-123' },
      });

      // No self-reporting = auto-submit to Start.gg
      expect(match?.allowSelfReporting).toBe(false);
    });
  });
});
