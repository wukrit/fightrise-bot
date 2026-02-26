/**
 * Unit tests for scoreHandler (report, confirm, dispute buttons).
 * Tests the handler logic by directly testing the handler functions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockButtonInteraction, createMockTextChannel, MockMessage } from '../../__tests__/harness';
import { INTERACTION_PREFIX } from '@fightrise/shared';
import { createInteractionId } from '@fightrise/shared';

// Import handlers
import { scoreHandler, confirmHandler, disputeHandler } from '../scoreHandler.js';

// Mock matchService
vi.mock('../../services/matchService', () => ({
  reportScore: vi.fn(),
  confirmResult: vi.fn(),
}));

describe('scoreHandler', () => {
  let mockChannel: ReturnType<typeof createMockTextChannel>;
  let mockMessage: MockMessage;

  beforeEach(() => {
    mockChannel = createMockTextChannel({
      id: 'channel-123',
      guildId: 'guild-123',
    });

    mockMessage = {
      id: 'message-123',
      content: '',
      author: { id: 'bot-123', username: 'TestBot', bot: true },
      embeds: [],
      components: [],
      createdAt: new Date(),
      channelId: 'channel-123',
      guildId: 'guild-123',
      edit: vi.fn().mockResolvedValue(undefined),
    };

    vi.clearAllMocks();
  });

  describe('report button validation', () => {
    it('should validate winner slot is 1 or 2', async () => {
      // Test validation by directly calling with invalid slot
      const matchId = 'c123456789012345678901234';

      // Create interaction but don't provide message - handler won't reach service call
      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.REPORT, matchId, '1', 'quick'),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      // Import the mocked functions after mocking
      const { reportScore } = await import('../../services/matchService.js');

      // Mock the service to return success
      vi.mocked(reportScore).mockResolvedValue({
        success: true,
        message: 'Score reported',
        autoCompleted: true,
        matchStatus: {
          id: matchId,
          identifier: '1',
          roundText: 'Round 1',
          players: [
            { playerName: 'P1', discordId: 'u1', isWinner: true },
            { playerName: 'P2', discordId: 'u2', isWinner: false },
          ],
        },
      });

      await scoreHandler.execute(interaction as unknown as Parameters<typeof scoreHandler.execute>[0], [matchId, '1', 'quick']);

      expect(reportScore).toHaveBeenCalled();
    });

    it('should reject invalid winner slot', async () => {
      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.REPORT, 'c123456789012345678901234', '0', 'quick'),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { reportScore } = await import('../../services/matchService.js');

      await scoreHandler.execute(interaction as unknown as Parameters<typeof scoreHandler.execute>[0], ['c123456789012345678901234', '0', 'quick']);

      // With invalid slot, the handler should return early without calling service
      expect(reportScore).not.toHaveBeenCalled();
    });
  });

  describe('confirm button validation', () => {
    it('should call confirmResult with confirmed=true', async () => {
      const matchId = 'c123456789012345678901234';
      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.CONFIRM, matchId),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { confirmResult } = await import('../../services/matchService.js');
      vi.mocked(confirmResult).mockResolvedValue({
        success: true,
        message: 'Confirmed!',
        matchStatus: null,
      });

      await confirmHandler.execute(interaction as unknown as Parameters<typeof confirmHandler.execute>[0], [matchId]);

      expect(confirmResult).toHaveBeenCalledWith(matchId, 'user-123', true);
    });
  });

  describe('dispute button validation', () => {
    it('should call confirmResult with confirmed=false', async () => {
      const matchId = 'c123456789012345678901234';
      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.DISPUTE, matchId),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { confirmResult } = await import('../../services/matchService.js');
      vi.mocked(confirmResult).mockResolvedValue({
        success: true,
        message: 'Disputed!',
        matchStatus: null,
      });

      await disputeHandler.execute(interaction as unknown as Parameters<typeof disputeHandler.execute>[0], [matchId]);

      expect(confirmResult).toHaveBeenCalledWith(matchId, 'user-123', false);
    });
  });
});
