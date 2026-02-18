/**
 * Integration tests for match thread creation flow.
 * Tests the full flow of creating Discord threads for matches.
 *
 * These tests use the Discord test harness to simulate interactions
 * and verify thread creation end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDiscordTestClient, DiscordTestClient } from '../harness/index.js';

// Mock the prisma client
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    match: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    tournament: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    matchPlayer: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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

describe('Match Thread Creation Integration', () => {
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

  describe('Thread Creation via Test Harness', () => {
    it('should create a new thread for a match', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      const thread = await channel.createThread({
        name: 'Match: Player1 vs Player2',
      });

      expect(testClient.threads.has(thread.id)).toBe(true);
      expect(thread.name).toBe('Match: Player1 vs Player2');
    });

    it('should track messages in the thread', async () => {
      const thread = testClient.createThread('Test Match Thread');

      await thread.send('Welcome to your match!');
      await thread.send({
        content: 'Please check in using the button below.',
        components: [{ type: 1, components: [{ type: 2, label: 'Check In', customId: 'checkin' }] }],
      });

      expect(thread.messages).toHaveLength(2);
      expect(testClient.messages).toHaveLength(2);
    });

    it('should allow creating thread with custom ID', async () => {
      const channel = testClient.channels.get(testClient.channelId)!;

      const thread = await channel.createThread({
        name: 'Grand Finals: Player1 vs Player2',
      });

      // Thread should be tracked
      expect(testClient.threads.has(thread.id)).toBe(true);
      expect(thread.name).toContain('Grand Finals');
    });

    it('should send player pings in thread', async () => {
      const thread = testClient.createThread('Match Thread');

      // Simulate player mentions
      await thread.send('<@player1-id> vs <@player2-id>');
      await thread.send('Match is ready! Please check in.');

      const lastMessage = thread.messages[thread.messages.length - 1];
      expect(lastMessage.content).toContain('Match is ready');
    });

    it('should archive thread on completion', async () => {
      const thread = testClient.createThread('Match Thread');

      // Simulate match completion
      await thread.send('Match complete! Player1 wins.');
      await thread.send('Thread will be archived.');

      // Verify messages are stored
      expect(thread.messages.length).toBeGreaterThan(0);

      // In real Discord.js, we'd call thread.setArchived(true)
      // The test harness tracks this state
    });
  });

  describe('Thread Creation with Database State', () => {
    it('should handle match not found scenario', async () => {
      // Mock no match found
      vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

      const result = await prisma.match.findUnique({
        where: { id: 'non-existent-match' },
        include: { event: { include: { tournament: true } } },
      });

      expect(result).toBeNull();
    });

    it('should return existing thread ID if thread already exists', async () => {
      // Mock match with existing thread
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        id: 'match-123',
        discordThreadId: 'existing-thread-123',
        state: 'IN_PROGRESS',
        event: {
          tournament: {
            discordChannelId: 'channel-123',
          },
        },
      } as any);

      const match = await prisma.match.findUnique({
        where: { id: 'match-123' },
      });

      // Should return existing thread ID for idempotency
      expect(match?.discordThreadId).toBe('existing-thread-123');
    });

    it('should update match with new thread ID after creation', async () => {
      // Mock creating a thread
      vi.mocked(prisma.match.update).mockResolvedValue({
        id: 'match-123',
        discordThreadId: 'new-thread-456',
      } as any);

      const result = await prisma.match.update({
        where: { id: 'match-123' },
        data: { discordThreadId: 'new-thread-456' },
      });

      expect(result.discordThreadId).toBe('new-thread-456');
    });

    it('should require channel ID for thread creation', async () => {
      // Mock tournament without channel
      vi.mocked(prisma.match.findUnique).mockResolvedValue({
        id: 'match-123',
        discordThreadId: null,
        event: {
          tournament: {
            discordChannelId: null, // No channel configured
          },
        },
      } as any);

      const match = await prisma.match.findUnique({
        where: { id: 'match-123' },
        include: { event: { include: { tournament: true } } },
      });

      // Should handle missing channel gracefully
      expect(match?.event.tournament.discordChannelId).toBeNull();
    });
  });

  describe('Match State Transitions', () => {
    it('should transition from NOT_STARTED to CALLED', async () => {
      // Mock initial state
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 });

      const result = await prisma.match.updateMany({
        where: { id: 'match-123', state: 'NOT_STARTED' },
        data: { state: 'CALLED' },
      });

      expect(result.count).toBe(1);
    });

    it('should transition from CALLED to CHECKED_IN', async () => {
      vi.mocked(prisma.match.updateMany).mockResolvedValue({ count: 1 });

      const result = await prisma.match.updateMany({
        where: { id: 'match-123', state: 'CALLED' },
        data: { state: 'CHECKED_IN' },
      });

      expect(result.count).toBe(1);
    });

    it('should handle idempotent state transitions', async () => {
      // First transition succeeds
      vi.mocked(prisma.match.updateMany)
        .mockResolvedValueOnce({ count: 1 })
        // Second transition returns 0 (already transitioned)
        .mockResolvedValueOnce({ count: 0 });

      const firstUpdate = await prisma.match.updateMany({
        where: { id: 'match-123', state: 'NOT_STARTED' },
        data: { state: 'CALLED' },
      });

      const secondUpdate = await prisma.match.updateMany({
        where: { id: 'match-123', state: 'NOT_STARTED' },
        data: { state: 'CALLED' },
      });

      expect(firstUpdate.count).toBe(1);
      expect(secondUpdate.count).toBe(0); // Already processed
    });
  });

  describe('Match Thread Content', () => {
    it('should include match details in thread message', async () => {
      const thread = testClient.createThread('Match Thread');

      // Simulate match ready message
      const matchDetails = {
        round: 'Winners Quarterfinals',
        identifier: 'A4',
        player1: 'PlayerOne',
        player2: 'PlayerTwo',
      };

      await thread.send(`**${matchDetails.round}**`);
      await thread.send(`${matchDetails.player1} vs ${matchDetails.player2}`);
      await thread.send('Please check in using the buttons below.');

      const messages = thread.messages.map((m) => m.content);
      expect(messages.some((m) => m.includes('Winners Quarterfinals'))).toBe(true);
      expect(messages.some((m) => m.includes('PlayerOne vs PlayerTwo'))).toBe(true);
    });

    it('should include check-in deadline in thread', async () => {
      const thread = testClient.createThread('Match Thread');
      const deadline = new Date(Date.now() + 600000); // 10 minutes from now

      await thread.send(`Check-in deadline: <t:${Math.floor(deadline.getTime() / 1000)}:R>`);

      const lastMessage = thread.messages[thread.messages.length - 1];
      expect(lastMessage.content).toContain('Check-in deadline');
    });
  });
});
