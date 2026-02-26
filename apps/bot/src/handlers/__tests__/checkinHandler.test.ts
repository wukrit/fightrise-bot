/**
 * Unit tests for checkinHandler.
 * Tests the check-in button handler logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockButtonInteraction, createMockTextChannel, MockMessage } from '../../__tests__/harness';
import { INTERACTION_PREFIX } from '@fightrise/shared';
import { createInteractionId } from '@fightrise/shared';

// Import handlers
import { checkinHandler } from '../checkin.js';

// Mock matchService
vi.mock('../../services/matchService', () => ({
  checkInPlayer: vi.fn(),
}));

describe('checkinHandler', () => {
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

  describe('checkin validation', () => {
    it('should call checkInPlayer with valid match ID and player slot', async () => {
      const matchId = 'c123456789012345678901234';

      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '1'),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { checkInPlayer } = await import('../../services/matchService.js');
      vi.mocked(checkInPlayer).mockResolvedValue({
        success: true,
        message: 'Checked in!',
        bothCheckedIn: false,
        matchStatus: {
          id: matchId,
          identifier: '1',
          roundText: 'Round 1',
          players: [
            { playerName: 'Player1', discordId: 'user-123', isCheckedIn: true },
            { playerName: 'Player2', discordId: 'user-456', isCheckedIn: false },
          ],
        },
      });

      await checkinHandler.execute(interaction as unknown as Parameters<typeof checkinHandler.execute>[0], [matchId, '1']);

      expect(checkInPlayer).toHaveBeenCalledWith(matchId, 'user-123');
    });

    it('should reject invalid player slot (0)', async () => {
      const matchId = 'c123456789012345678901234';

      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '0'),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { checkInPlayer } = await import('../../services/matchService.js');

      await checkinHandler.execute(interaction as unknown as Parameters<typeof checkinHandler.execute>[0], [matchId, '0']);

      expect(checkInPlayer).not.toHaveBeenCalled();
    });

    it('should reject invalid player slot (3)', async () => {
      const matchId = 'c123456789012345678901234';

      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '3'),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { checkInPlayer } = await import('../../services/matchService.js');

      await checkinHandler.execute(interaction as unknown as Parameters<typeof checkinHandler.execute>[0], [matchId, '3']);

      expect(checkInPlayer).not.toHaveBeenCalled();
    });

    it('should handle both players checked in', async () => {
      const matchId = 'c123456789012345678901234';

      const interaction = createMockButtonInteraction({
        customId: createInteractionId(INTERACTION_PREFIX.CHECK_IN, matchId, '1'),
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { checkInPlayer } = await import('../../services/matchService.js');
      vi.mocked(checkInPlayer).mockResolvedValue({
        success: true,
        message: 'Both players checked in! Match is live.',
        bothCheckedIn: true,
        matchStatus: {
          id: matchId,
          identifier: '1',
          roundText: 'Round 1',
          players: [
            { playerName: 'Player1', discordId: 'user-123', isCheckedIn: true },
            { playerName: 'Player2', discordId: 'user-456', isCheckedIn: true },
          ],
        },
      });

      await checkinHandler.execute(interaction as unknown as Parameters<typeof checkinHandler.execute>[0], [matchId, '1']);

      expect(checkInPlayer).toHaveBeenCalledWith(matchId, 'user-123');
    });

    it('should handle missing parts', async () => {
      const interaction = createMockButtonInteraction({
        customId: INTERACTION_PREFIX.CHECK_IN,
        user: { id: 'user-123', username: 'TestUser' },
        member: { id: 'user-123', guildId: 'guild-123' },
        guild: { id: 'guild-123' },
        channel: mockChannel,
        message: mockMessage,
      });

      const { checkInPlayer } = await import('../../services/matchService.js');

      // Missing matchId and playerSlot
      await checkinHandler.execute(interaction as unknown as Parameters<typeof checkinHandler.execute>[0], []);

      expect(checkInPlayer).not.toHaveBeenCalled();
    });
  });
});
