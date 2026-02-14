import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RegistrationStatus } from '@fightrise/database';
import { MockButtonInteraction } from '../../__tests__/harness/MockInteraction.js';

// Mock the database module
vi.mock('@fightrise/database', () => ({
  prisma: {
    registration: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tournamentAdmin: {
      findFirst: vi.fn(),
    },
  },
  RegistrationStatus: {
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    PENDING: 'PENDING',
  },
}));

// Mock discord.js - simplified mock without Proxy
vi.mock('discord.js', () => {
  // Simple chainable mock - all methods return the mock object for chaining
  const createChainableMock = () => {
    const mock: Record<string, () => typeof mock> = {};
    for (const method of [
      'setTitle',
      'setDescription',
      'setColor',
      'addFields',
    ]) {
      mock[method] = () => mock as never;
    }
    return mock;
  };

  return {
    Colors: {
      Green: 0x57f287,
      Red: 0xed4245,
      Blue: 0x5865f2,
    },
    EmbedBuilder: class {
      constructor() {
        return createChainableMock();
      }
    },
  };
});

import { prisma, RegistrationStatus as RegStatus } from '@fightrise/database';
import { registrationHandler } from '../registration.js';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('registrationHandler', () => {
  let mockInteraction: MockButtonInteraction;

  const mockRegistration = {
    id: 'reg-123',
    tournamentId: 'tourney-123',
    userId: 'user-123',
    displayName: 'Test Player',
    status: RegStatus.PENDING,
    source: 'DISCORD',
    createdAt: new Date(),
    tournament: {
      id: 'tourney-123',
      name: 'Test Tournament',
    },
    user: {
      id: 'user-123',
      discordId: 'discord-456',
      discordUsername: 'testplayer',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockInteraction = new MockButtonInteraction({
      customId: 'registration:approve:reg-123',
      user: { id: 'admin-123' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle approve (reg:approve:{registrationId})', () => {
    it('should approve a pending registration', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.tournamentAdmin.findFirst.mockResolvedValue({ id: 'admin-1' });
      mockPrisma.registration.update.mockResolvedValue({
        ...mockRegistration,
        status: RegStatus.CONFIRMED,
      });

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['approve', 'reg-123']);

      expect(mockPrisma.registration.findUnique).toHaveBeenCalledWith({
        where: { id: 'reg-123' },
        include: { tournament: true, user: true },
      });
      expect(mockPrisma.tournamentAdmin.findFirst).toHaveBeenCalledWith({
        where: { user: { discordId: 'admin-123' }, tournamentId: 'tourney-123' },
      });
      expect(mockPrisma.registration.update).toHaveBeenCalledWith({
        where: { id: 'reg-123' },
        data: { status: RegStatus.CONFIRMED },
      });
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should reject if registration not found', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(null);

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['approve', 'reg-123']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Registration not found.',
      });
    });

    it('should reject if user is not a tournament admin', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.tournamentAdmin.findFirst.mockResolvedValue(null);

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['approve', 'reg-123']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You are not an admin for this tournament.',
      });
    });
  });

  describe('handle reject (reg:reject:{registrationId})', () => {
    it('should reject a pending registration', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.tournamentAdmin.findFirst.mockResolvedValue({ id: 'admin-1' });
      mockPrisma.registration.update.mockResolvedValue({
        ...mockRegistration,
        status: RegStatus.CANCELLED,
      });

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['reject', 'reg-123']);

      expect(mockPrisma.registration.update).toHaveBeenCalledWith({
        where: { id: 'reg-123' },
        data: { status: RegStatus.CANCELLED },
      });
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should reject if registration not found', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(null);

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['reject', 'reg-123']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Registration not found.',
      });
    });

    it('should reject if user is not a tournament admin', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);
      mockPrisma.tournamentAdmin.findFirst.mockResolvedValue(null);

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['reject', 'reg-123']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You are not an admin for this tournament.',
      });
    });
  });

  describe('handle info (reg:info:{registrationId})', () => {
    it('should show registration details', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(mockRegistration);

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['info', 'reg-123']);

      expect(mockPrisma.registration.findUnique).toHaveBeenCalledWith({
        where: { id: 'reg-123' },
        include: { tournament: true, user: true },
      });
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should return error if registration not found', async () => {
      mockPrisma.registration.findUnique.mockResolvedValue(null);

      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['info', 'reg-123']);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Registration not found.',
      });
    });
  });

  describe('handle unknown action', () => {
    it('should do nothing for unknown action', async () => {
      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, ['unknown', 'reg-123']);

      expect(mockPrisma.registration.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('handle missing action', () => {
    it('should do nothing for empty parts', async () => {
      await registrationHandler.execute(mockInteraction as unknown as import('discord.js').ButtonInteraction, []);

      expect(mockPrisma.registration.findUnique).not.toHaveBeenCalled();
    });
  });
});
