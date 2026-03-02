/**
 * Integration tests for User model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and relationship operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createTestPrisma, clearDatabase } from '../utils/test-setup';
import { createUser, createLinkedUser, createRegistration } from '../utils/seeders';
import type { User, Tournament } from '@prisma/client';

describe('User Model Integration Tests', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    const setup = await createTestPrisma();
    prisma = setup.prisma;
    databaseUrl = setup.databaseUrl;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  describe('User Create Operations', () => {
    it('should create user with discordId', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-12345',
        discordUsername: 'testuser',
        displayName: 'Test User',
      });

      expect(user.id).toBeDefined();
      expect(user.discordId).toBe('discord-12345');
      expect(user.discordUsername).toBe('testuser');
      expect(user.displayName).toBe('Test User');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create linked user with discord and startgg', async () => {
      const user = await createLinkedUser(prisma, {
        discordId: 'discord-67890',
        startggId: 'startgg-12345',
        startggSlug: 'player-one',
        startggGamerTag: 'PlayerOne',
        displayName: 'Linked Player',
      });

      expect(user.id).toBeDefined();
      expect(user.discordId).toBe('discord-67890');
      expect(user.startggId).toBe('startgg-12345');
      expect(user.startggSlug).toBe('player-one');
      expect(user.startggGamerTag).toBe('PlayerOne');
    });

    it('should create user with email only', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          displayName: 'Email User',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBe('Email User');
    });
  });

  describe('User Read Operations', () => {
    it('should find user by discordId', async () => {
      const created = await createUser(prisma, {
        discordId: 'discord-findme',
        displayName: 'Find Me',
      });

      const found = await prisma.user.findUnique({
        where: { discordId: 'discord-findme' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.displayName).toBe('Find Me');
    });

    it('should find user by startggId', async () => {
      const created = await createLinkedUser(prisma, {
        startggId: 'startgg-findme',
      });

      const found = await prisma.user.findUnique({
        where: { startggId: 'startgg-findme' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should find user by email', async () => {
      const created = await prisma.user.create({
        data: {
          email: 'findby@email.com',
          displayName: 'Email Finder',
        },
      });

      const found = await prisma.user.findUnique({
        where: { email: 'findby@email.com' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should list all users', async () => {
      await createUser(prisma, { displayName: 'User 1' });
      await createUser(prisma, { displayName: 'User 2' });
      await createUser(prisma, { displayName: 'User 3' });

      const users = await prisma.user.findMany();

      expect(users.length).toBe(3);
    });

    it('should filter users by multiple criteria', async () => {
      await createUser(prisma, { discordUsername: 'alice' });
      await createLinkedUser(prisma, { discordUsername: 'bob' });
      await createUser(prisma, { discordUsername: 'charlie' });

      const usersWithDiscord = await prisma.user.findMany({
        where: { discordUsername: { not: null } },
      });

      expect(usersWithDiscord.length).toBe(3);
    });
  });

  describe('User Update Operations', () => {
    it('should update displayName', async () => {
      const user = await createUser(prisma, {
        displayName: 'Old Name',
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { displayName: 'New Name' },
      });

      expect(updated.displayName).toBe('New Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        user.updatedAt.getTime()
      );
    });

    it('should update startggGamerTag', async () => {
      const user = await createLinkedUser(prisma, {
        startggGamerTag: 'OldTag',
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { startggGamerTag: 'NewTag' },
      });

      expect(updated.startggGamerTag).toBe('NewTag');
    });

    it('should update discordUsername and avatar', async () => {
      const user = await createUser(prisma, {
        discordUsername: 'oldusername',
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          discordUsername: 'newusername',
          discordAvatar: 'new-avatar-hash',
        },
      });

      expect(updated.discordUsername).toBe('newusername');
      expect(updated.discordAvatar).toBe('new-avatar-hash');
    });

    it('should link startgg account to existing discord user', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-link',
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          startggId: 'startgg-linked',
          startggSlug: 'linked-player',
          startggGamerTag: 'LinkedPlayer',
        },
      });

      expect(updated.startggId).toBe('startgg-linked');
      expect(updated.startggSlug).toBe('linked-player');
      expect(updated.startggGamerTag).toBe('LinkedPlayer');
    });
  });

  describe('User Delete Operations', () => {
    it('should delete user', async () => {
      const user = await createUser(prisma, {
        displayName: 'To Delete',
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const found = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete registrations when user deleted', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-cascade',
      });

      // Create tournament
      const tournament = await prisma.tournament.create({
        data: {
          startggId: 'startgg-cascade-tournament',
          startggSlug: 'cascade-tournament',
          name: 'Cascade Tournament',
        },
      });

      // Create registration
      await createRegistration(prisma, user.id, tournament.id, {
        status: 'CONFIRMED',
      });

      // Verify registration exists
      const registrationsBefore = await prisma.registration.findMany({
        where: { userId: user.id },
      });
      expect(registrationsBefore.length).toBe(1);

      // Delete user
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Verify registrations are deleted (cascade)
      const registrationsAfter = await prisma.registration.findMany({
        where: { userId: user.id },
      });
      expect(registrationsAfter.length).toBe(0);
    });

    it('should handle delete of non-existent user gracefully', async () => {
      await expect(
        prisma.user.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('User Relationships', () => {
    it('should have registrations relation', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-rel',
      });

      const tournament = await prisma.tournament.create({
        data: {
          startggId: 'startgg-rel-tournament',
          startggSlug: 'rel-tournament',
          name: 'Relation Tournament',
        },
      });

      await createRegistration(prisma, user.id, tournament.id);

      const userWithRegistrations = await prisma.user.findUnique({
        where: { id: user.id },
        include: { registrations: true },
      });

      expect(userWithRegistrations?.registrations).toHaveLength(1);
      expect(userWithRegistrations?.registrations[0].tournamentId).toBe(
        tournament.id
      );
    });

    it('should have matchPlayers relation', async () => {
      const user = await createLinkedUser(prisma, {
        discordId: 'discord-mp',
        startggId: 'startgg-mp',
      });

      const tournament = await prisma.tournament.create({
        data: {
          startggId: 'startgg-mp-tournament',
          startggSlug: 'mp-tournament',
          name: 'Match Player Tournament',
        },
      });

      const event = await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'startgg-mp-event',
          name: 'Match Player Event',
        },
      });

      const match = await prisma.match.create({
        data: {
          eventId: event.id,
          startggSetId: 'startgg-mp-set',
          identifier: 'A1',
          roundText: 'Round 1',
          round: 1,
        },
      });

      await prisma.matchPlayer.create({
        data: {
          matchId: match.id,
          userId: user.id,
          playerName: user.displayName ?? 'Test Player',
          startggEntrantId: 'entrant-1',
        },
      });

      const userWithPlayers = await prisma.user.findUnique({
        where: { id: user.id },
        include: { matchPlayers: true },
      });

      expect(userWithPlayers?.matchPlayers).toHaveLength(1);
      expect(userWithPlayers?.matchPlayers[0].matchId).toBe(match.id);
    });
  });
});
