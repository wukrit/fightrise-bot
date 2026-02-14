import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MatchState } from '@fightrise/database';
import type { MatchStatus, ReportResult, ConfirmResult } from '../../services/matchService.js';
import { MockButtonInteraction } from '../../__tests__/harness/MockInteraction.js';

// Mock the services before imports
vi.mock('../../services/matchService.js', () => ({
  reportScore: vi.fn(),
  confirmResult: vi.fn(),
}));

// Mock the shared package
vi.mock('@fightrise/shared', () => ({
  INTERACTION_PREFIX: {
    CHECK_IN: 'checkin',
    REPORT: 'report',
    CONFIRM: 'confirm',
    DISPUTE: 'dispute',
  },
  DISCORD_COLORS: {
    SUCCESS: 0x57f287,
    WARNING: 0xfee75c,
    ERROR: 0xed4245,
  },
  createInteractionId: (prefix: string, ...parts: string[]) =>
    [prefix, ...parts].join(':'),
}));

// Mock discord.js builders - simplified mock without Proxy
vi.mock('discord.js', () => {
  // Simple chainable mock - all methods return the mock object for chaining
  const createChainableMock = () => {
    const mock: Record<string, () => typeof mock> = {};
    for (const method of [
      'setTitle',
      'setDescription',
      'setColor',
      'addFields',
      'addComponents',
      'setCustomId',
      'setLabel',
      'setStyle',
    ]) {
      mock[method] = () => mock as never;
    }
    return mock;
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
      Danger: 4,
    },
  };
});

import { reportScore, confirmResult } from '../../services/matchService.js';
import { scoreHandler, confirmHandler, disputeHandler } from '../scoreHandler.js';

// Valid CUID format match ID for testing
const VALID_MATCH_ID = 'c123456789012345678901234';

const createMockMatchStatus = (overrides?: Partial<MatchStatus>): MatchStatus => ({
  id: VALID_MATCH_ID,
  identifier: 'A1',
  roundText: 'Winners Round 1',
  state: MatchState.CHECKED_IN,
  discordThreadId: 'thread-123',
  checkInDeadline: null,
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
      isCheckedIn: true,
      checkedInAt: new Date(),
      discordId: 'discord-222',
    },
  ],
  ...overrides,
});

describe('scoreHandler', () => {
  let mockInteraction: MockButtonInteraction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = new MockButtonInteraction({
      customId: `report:${VALID_MATCH_ID}:1`,
      user: { id: 'discord-111' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle winner reporting (self-report)', () => {
    it('should delegate to reportScore service and show pending confirmation', async () => {
      const matchStatus = createMockMatchStatus({
        state: MatchState.PENDING_CONFIRMATION,
        players: [
          { id: 'player-1', playerName: 'Player One', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-111', isWinner: true },
          { id: 'player-2', playerName: 'Player Two', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-222', isWinner: null },
        ],
      });

      vi.mocked(reportScore).mockResolvedValue({
        success: true,
        message: 'You reported yourself as the winner. Waiting for Player Two to confirm.',
        autoCompleted: false,
        matchStatus,
      });

      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID, '1']);

      expect(reportScore).toHaveBeenCalledWith(VALID_MATCH_ID, 'discord-111', 1);
      expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You reported yourself as the winner. Waiting for Player Two to confirm.',
      });
      expect(mockInteraction.message?.edit).toHaveBeenCalled();
      expect(mockInteraction.channel?.send).toHaveBeenCalled();
    });

    it('should return error message when service fails', async () => {
      vi.mocked(reportScore).mockResolvedValue({
        success: false,
        message: 'Match not found.',
        autoCompleted: false,
      });

      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID, '1']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Match not found.',
      });
      expect(mockInteraction.message?.edit).not.toHaveBeenCalled();
    });

    it('should auto-complete match when opponent confirms (loser confirmation)', async () => {
      const matchStatus = createMockMatchStatus({
        state: MatchState.COMPLETED,
        players: [
          { id: 'player-1', playerName: 'Player One', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-111', isWinner: true },
          { id: 'player-2', playerName: 'Player Two', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-222', isWinner: false },
        ],
      });

      vi.mocked(reportScore).mockResolvedValue({
        success: true,
        message: 'Match complete! Player One wins.',
        autoCompleted: true,
        matchStatus,
      });

      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID, '1']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Match complete! Player One wins.',
      });
      expect(mockInteraction.message?.edit).toHaveBeenCalled();
      expect(mockInteraction.channel?.send).toHaveBeenCalledWith(
        'Match complete! Player One wins. Good games!'
      );
    });
  });

  describe('handle loser confirmation', () => {
    it('should auto-complete when reporter claims opponent won', async () => {
      // User is player 1 but reports that player 2 (opponent) won
      mockInteraction.user.id = 'discord-111';
      mockInteraction.customId = `report:${VALID_MATCH_ID}:2`;

      const matchStatus = createMockMatchStatus({
        state: MatchState.COMPLETED,
        players: [
          { id: 'player-1', playerName: 'Player One', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-111', isWinner: false },
          { id: 'player-2', playerName: 'Player Two', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-222', isWinner: true },
        ],
      });

      vi.mocked(reportScore).mockResolvedValue({
        success: true,
        message: 'Match complete! Player Two wins.',
        autoCompleted: true,
        matchStatus,
      });

      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID, '2']);

      expect(reportScore).toHaveBeenCalledWith(VALID_MATCH_ID, 'discord-111', 2);
      expect(mockInteraction.message?.edit).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should reject invalid match ID format', async () => {
      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['invalid-id', '1']);

      expect(reportScore).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button.',
        ephemeral: true,
      });
    });

    it('should reject invalid winner slot', async () => {
      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID, '3']);

      expect(reportScore).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button.',
        ephemeral: true,
      });
    });

    it('should reject malformed customId parts', async () => {
      await scoreHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['']);

      expect(reportScore).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button format.',
        ephemeral: true,
      });
    });
  });
});

describe('confirmHandler', () => {
  let mockInteraction: MockButtonInteraction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = new MockButtonInteraction({
      customId: `confirm:${VALID_MATCH_ID}`,
      user: { id: 'discord-222' }, // The opponent (non-reporter)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle confirmation', () => {
    it('should confirm result and complete match', async () => {
      const matchStatus = createMockMatchStatus({
        state: MatchState.COMPLETED,
        players: [
          { id: 'player-1', playerName: 'Player One', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-111', isWinner: true },
          { id: 'player-2', playerName: 'Player Two', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-222', isWinner: false },
        ],
      });

      vi.mocked(confirmResult).mockResolvedValue({
        success: true,
        message: 'Match complete! Player One wins.',
        matchStatus,
      });

      await confirmHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID]);

      expect(confirmResult).toHaveBeenCalledWith(VALID_MATCH_ID, 'discord-222', true);
      expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Match complete! Player One wins.',
      });
      expect(mockInteraction.message?.edit).toHaveBeenCalled();
      expect(mockInteraction.channel?.send).toHaveBeenCalledWith(
        'Match complete! Player One wins. Good games!'
      );
    });

    it('should return error when confirmation fails', async () => {
      vi.mocked(confirmResult).mockResolvedValue({
        success: false,
        message: 'Match state changed. Please try again.',
      });

      await confirmHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID]);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Match state changed. Please try again.',
      });
      expect(mockInteraction.message?.edit).not.toHaveBeenCalled();
    });

    it('should prevent reporter from confirming their own report', async () => {
      // User who reported cannot confirm their own report
      mockInteraction.user.id = 'discord-111';

      vi.mocked(confirmResult).mockResolvedValue({
        success: false,
        message: 'You cannot confirm your own report.',
      });

      await confirmHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID]);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You cannot confirm your own report.',
      });
    });
  });

  describe('validation', () => {
    it('should reject invalid match ID format', async () => {
      await confirmHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['invalid-id']);

      expect(confirmResult).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button.',
        ephemeral: true,
      });
    });

    it('should reject malformed customId parts', async () => {
      await confirmHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, []);

      expect(confirmResult).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button format.',
        ephemeral: true,
      });
    });
  });
});

describe('disputeHandler', () => {
  let mockInteraction: MockButtonInteraction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = new MockButtonInteraction({
      customId: `dispute:${VALID_MATCH_ID}`,
      user: { id: 'discord-222' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle dispute flow', () => {
    it('should dispute result and reset match state', async () => {
      const matchStatus = createMockMatchStatus({
        state: MatchState.CHECKED_IN,
        players: [
          { id: 'player-1', playerName: 'Player One', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-111', isWinner: null },
          { id: 'player-2', playerName: 'Player Two', isCheckedIn: true, checkedInAt: new Date(), discordId: 'discord-222', isWinner: null },
        ],
      });

      vi.mocked(confirmResult).mockResolvedValue({
        success: true,
        message: 'Result disputed. Please report the correct winner.',
        matchStatus,
      });

      await disputeHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID]);

      expect(confirmResult).toHaveBeenCalledWith(VALID_MATCH_ID, 'discord-222', false);
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Result disputed. Please report the correct winner.',
      });
      expect(mockInteraction.message?.edit).toHaveBeenCalled();
      expect(mockInteraction.channel?.send).toHaveBeenCalledWith(
        'Result disputed! Please discuss and report the correct result, or contact a tournament organizer.'
      );
    });

    it('should return error when dispute fails', async () => {
      vi.mocked(confirmResult).mockResolvedValue({
        success: false,
        message: 'Match state changed. Please try again.',
      });

      await disputeHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID]);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Match state changed. Please try again.',
      });
      expect(mockInteraction.message?.edit).not.toHaveBeenCalled();
    });

    it('should prevent reporter from disputing their own report', async () => {
      mockInteraction.user.id = 'discord-111';

      vi.mocked(confirmResult).mockResolvedValue({
        success: false,
        message: 'You cannot confirm your own report.',
      });

      await disputeHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, [VALID_MATCH_ID]);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You cannot confirm your own report.',
      });
    });
  });

  describe('validation', () => {
    it('should reject invalid match ID format', async () => {
      await disputeHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['invalid-id']);

      expect(confirmResult).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button.',
        ephemeral: true,
      });
    });

    it('should reject malformed customId parts', async () => {
      await disputeHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, []);

      expect(confirmResult).not.toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Invalid button format.',
        ephemeral: true,
      });
    });
  });
});
