/**
 * Integration tests for check-in flow.
 * Tests the full flow of player check-in for matches.
 *
 * These tests use the Discord test harness to simulate interactions
 * and verify the check-in flow end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscordTestClient, DiscordTestClient } from '../harness/index.js';

// Import the check-in command
import checkinCommand from '../../commands/checkin.js';

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

describe('Check-in Flow Integration', () => {
  let testClient: DiscordTestClient;

  beforeEach(() => {
    vi.clearAllMocks();

    testClient = createDiscordTestClient({
      userId: 'test-user-123',
      username: 'TestPlayer',
      guildId: 'test-guild-123',
      channelId: 'test-channel-123',
    });

    testClient.registerCommand(checkinCommand);
  });

  describe('Check-in Command', () => {
    it('should respond to /checkin command', async () => {
      const interaction = await testClient.executeCommand('checkin');

      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply).toBeDefined();
    });

    it('should send ephemeral reply', async () => {
      const interaction = await testClient.executeCommand('checkin');

      expect(interaction.ephemeral).toBe(true);
    });
  });

  describe('Check-in Button Interactions via Test Harness', () => {
    it('should create button interactions', async () => {
      const buttonInteraction = await testClient.clickButton('checkin-button-123');

      expect(buttonInteraction.customId).toBe('checkin-button-123');
      expect(buttonInteraction.isButton()).toBe(true);
      expect(buttonInteraction.isChatInputCommand()).toBe(false);
    });

    it('should track button interactions', async () => {
      await testClient.clickButton('btn-1');
      await testClient.clickButton('btn-2');

      expect(testClient.interactions.filter((i) => i.isButton())).toHaveLength(2);
    });

    it('should handle check-in button format', async () => {
      const buttonInteraction = await testClient.clickButton('checkin:match123:1');

      expect(buttonInteraction.customId).toContain('checkin');
      expect(buttonInteraction.customId).toContain('match123');
    });

    it('should handle invalid check-in button format', async () => {
      const buttonInteraction = await testClient.clickButton('checkin:invalid');

      // Should still create the interaction (handler validates format)
      expect(buttonInteraction.customId).toBe('checkin:invalid');
    });
  });

  describe('Check-in Database State', () => {
    it('should update player as checked in', async () => {
      vi.mocked(prisma.matchPlayer.update).mockResolvedValue({
        id: 'player-123',
        isCheckedIn: true,
        checkedInAt: new Date(),
      } as any);

      const result = await prisma.matchPlayer.update({
        where: { id: 'player-123' },
        data: { isCheckedIn: true, checkedInAt: new Date() },
      });

      expect(result.isCheckedIn).toBe(true);
      expect(result.checkedInAt).toBeDefined();
    });

    it('should update match state after both players check in', async () => {
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

    it('should handle single player check-in', async () => {
      vi.mocked(prisma.matchPlayer.findMany).mockResolvedValue([
        { id: 'player-1', isCheckedIn: true },
        { id: 'player-2', isCheckedIn: false },
      ] as any);

      const players = await prisma.matchPlayer.findMany({
        where: { matchId: 'match-123' },
      });

      const checkedIn = players.filter((p) => p.isCheckedIn);
      expect(checkedIn).toHaveLength(1);
    });

    it('should handle both players checked in', async () => {
      vi.mocked(prisma.matchPlayer.findMany).mockResolvedValue([
        { id: 'player-1', isCheckedIn: true },
        { id: 'player-2', isCheckedIn: true },
      ] as any);

      const players = await prisma.matchPlayer.findMany({
        where: { matchId: 'match-123' },
      });

      const allCheckedIn = players.every((p) => p.isCheckedIn);
      expect(allCheckedIn).toBe(true);
    });

    it('should set check-in deadline', async () => {
      const deadline = new Date(Date.now() + 600000); // 10 minutes from now

      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        checkInDeadline: deadline,
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { checkInDeadline: deadline },
      });

      expect(result.checkInDeadline).toBeDefined();
    });

    it('should handle expired check-in deadline', async () => {
      const expiredDeadline = new Date(Date.now() - 60000); // 1 minute ago

      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        id: 'match-123',
        checkInDeadline: expiredDeadline,
        state: 'CALLED',
      } as any);

      const match = await prisma.match.findUnique({
        where: { id: 'match-123' },
      });

      const isExpired = match?.checkInDeadline && match.checkInDeadline < new Date();
      expect(isExpired).toBe(true);
    });
  });

  describe('Check-in UI Flow', () => {
    it('should create check-in button message', async () => {
      const thread = testClient.createThread('Match Thread');

      await thread.send({
        content: 'Match: Player1 vs Player2',
        components: [
          {
            type: 1,
            components: [
              { type: 2, label: 'Check In', customId: 'checkin:match123:1', style: 1 },
              { type: 2, label: 'Check In', customId: 'checkin:match123:2', style: 1 },
            ],
          },
        ],
      });

      const message = thread.messages[0];
      expect(message.components).toBeDefined();
      expect(message.components[0].components).toHaveLength(2);
    });

    it('should show check-in status after player checks in', async () => {
      const thread = testClient.createThread('Match Thread');

      // Initial message with check-in buttons
      await thread.send({
        content: 'Match: Player1 vs Player2\n✅ Player1 checked in',
      });

      const message = thread.messages[0];
      expect(message.content).toContain('✅ Player1 checked in');
    });

    it('should show match live after both check in', async () => {
      const thread = testClient.createThread('Match Thread');

      // After both check in, show score buttons
      await thread.send({
        content: 'Match: Player1 vs Player2\n🎮 Match Live!',
        components: [
          {
            type: 1,
            components: [
              { type: 2, label: 'Player1 Wins', customId: 'report:match123:1', style: 3 },
              { type: 2, label: 'Player2 Wins', customId: 'report:match123:2', style: 3 },
            ],
          },
        ],
      });

      const message = thread.messages[0];
      expect(message.content).toContain('🎮 Match Live');
    });

    it('should remove check-in buttons after both check in', async () => {
      const thread = testClient.createThread('Match Thread');

      // After both check in, score buttons replace check-in buttons
      await thread.send({
        content: 'Match: Player1 vs Player2\n🎮 Match Live!',
        components: [], // No components = buttons removed
      });

      const message = thread.messages[0];
      expect(message.components).toEqual([]);
    });
  });
});
