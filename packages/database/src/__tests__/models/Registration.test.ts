/**
 * Integration tests for Registration model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and cascade operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, RegistrationSource, RegistrationStatus } from '@prisma/client';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';
import { createUser, createTournament, createEvent, createRegistration } from '../utils/seeders';
import type { Registration } from '@prisma/client';

describe('Registration Model Integration Tests', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    prisma = setup.prisma;
    databaseUrl = setup.databaseUrl;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase(prisma);
  });

  describe('Registration Create Operations', () => {
    it('should create registration with required fields', async () => {
      const user = await createUser(prisma, { discordId: 'discord-user-1' });
      const tournament = await createTournament(prisma);

      const registration = await prisma.registration.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
        },
      });

      expect(registration.id).toBeDefined();
      expect(registration.userId).toBe(user.id);
      expect(registration.tournamentId).toBe(tournament.id);
      expect(registration.source).toBe(RegistrationSource.DISCORD);
      expect(registration.status).toBe(RegistrationStatus.PENDING);
      expect(registration.createdAt).toBeInstanceOf(Date);
      expect(registration.updatedAt).toBeInstanceOf(Date);
    });

    it('should create registration with all fields', async () => {
      const user = await createUser(prisma, { discordId: 'discord-user-full' });
      const tournament = await createTournament(prisma);

      const registration = await prisma.registration.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
          startggEntrantId: 'entrant-12345',
          source: RegistrationSource.STARTGG,
          status: RegistrationStatus.CONFIRMED,
          displayName: 'Test Player',
        },
      });

      expect(registration.startggEntrantId).toBe('entrant-12345');
      expect(registration.source).toBe(RegistrationSource.STARTGG);
      expect(registration.status).toBe(RegistrationStatus.CONFIRMED);
      expect(registration.displayName).toBe('Test Player');
    });

    it('should create registration using factory helper', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);

      const registration = await createRegistration(prisma, user.id, tournament.id, {
        status: RegistrationStatus.CONFIRMED,
        displayName: 'Factory Registration',
      });

      expect(registration.id).toBeDefined();
      expect(registration.userId).toBe(user.id);
      expect(registration.status).toBe(RegistrationStatus.CONFIRMED);
      expect(registration.displayName).toBe('Factory Registration');
    });

    it('should create registration linked to event', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, { name: 'Street Fighter 6' });

      const registration = await createRegistration(prisma, user.id, tournament.id, {
        eventId: event.id,
        status: RegistrationStatus.CONFIRMED,
      });

      expect(registration.eventId).toBe(event.id);
    });

    it('should create multiple registrations for same tournament', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-2' });
      const user3 = await createUser(prisma, { discordId: 'discord-3' });

      const reg1 = await createRegistration(prisma, user1.id, tournament.id);
      const reg2 = await createRegistration(prisma, user2.id, tournament.id);
      const reg3 = await createRegistration(prisma, user3.id, tournament.id);

      expect(reg1.tournamentId).toBe(tournament.id);
      expect(reg2.tournamentId).toBe(tournament.id);
      expect(reg3.tournamentId).toBe(tournament.id);
    });
  });

  describe('Registration Read Operations', () => {
    it('should find registrations by user', async () => {
      const user = await createUser(prisma, { discordId: 'discord-findbyuser' });
      const tournament1 = await createTournament(prisma, { name: 'Tournament A' });
      const tournament2 = await createTournament(prisma, { name: 'Tournament B' });

      await createRegistration(prisma, user.id, tournament1.id);
      await createRegistration(prisma, user.id, tournament2.id);

      const userRegistrations = await prisma.registration.findMany({
        where: { userId: user.id },
      });

      expect(userRegistrations.length).toBe(2);
    });

    it('should find registrations by tournament', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-reg-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-reg-2' });

      await createRegistration(prisma, user1.id, tournament.id);
      await createRegistration(prisma, user2.id, tournament.id);

      const tournamentRegistrations = await prisma.registration.findMany({
        where: { tournamentId: tournament.id },
      });

      expect(tournamentRegistrations.length).toBe(2);
    });

    it('should find registrations by status', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-status-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-status-2' });
      const user3 = await createUser(prisma, { discordId: 'discord-status-3' });

      await createRegistration(prisma, user1.id, tournament.id, { status: RegistrationStatus.PENDING });
      await createRegistration(prisma, user2.id, tournament.id, { status: RegistrationStatus.CONFIRMED });
      await createRegistration(prisma, user3.id, tournament.id, { status: RegistrationStatus.CONFIRMED });

      const pending = await prisma.registration.findMany({
        where: { status: RegistrationStatus.PENDING },
      });
      expect(pending.length).toBe(1);

      const confirmed = await prisma.registration.findMany({
        where: { status: RegistrationStatus.CONFIRMED },
      });
      expect(confirmed.length).toBe(2);
    });

    it('should find registration by event', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, { name: 'SF6' });
      const user = await createUser(prisma);

      const registration = await createRegistration(prisma, user.id, tournament.id, {
        eventId: event.id,
      });

      const found = await prisma.registration.findMany({
        where: { eventId: event.id },
      });

      expect(found.length).toBe(1);
      expect(found[0].id).toBe(registration.id);
    });

    it('should include user relation when querying', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-rel',
        displayName: 'Related User',
      });
      const tournament = await createTournament(prisma);

      const registration = await createRegistration(prisma, user.id, tournament.id);

      const regWithUser = await prisma.registration.findUnique({
        where: { id: registration.id },
        include: { user: true },
      });

      expect(regWithUser?.user).not.toBeNull();
      expect(regWithUser?.user.id).toBe(user.id);
      expect(regWithUser?.user.displayName).toBe('Related User');
    });

    it('should include tournament relation when querying', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma, {
        name: 'Related Tournament',
      });

      const registration = await createRegistration(prisma, user.id, tournament.id);

      const regWithTournament = await prisma.registration.findUnique({
        where: { id: registration.id },
        include: { tournament: true },
      });

      expect(regWithTournament?.tournament).not.toBeNull();
      expect(regWithTournament?.tournament.id).toBe(tournament.id);
      expect(regWithTournament?.tournament.name).toBe('Related Tournament');
    });
  });

  describe('Registration Update Operations', () => {
    it('should update registration status', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const registration = await createRegistration(prisma, user.id, tournament.id, {
        status: RegistrationStatus.PENDING,
      });

      const updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { status: RegistrationStatus.CONFIRMED },
      });

      expect(updated.status).toBe(RegistrationStatus.CONFIRMED);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        registration.updatedAt.getTime()
      );
    });

    it('should update status through lifecycle', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const registration = await createRegistration(prisma, user.id, tournament.id);

      // Pending to Confirmed
      let updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { status: RegistrationStatus.CONFIRMED },
      });
      expect(updated.status).toBe(RegistrationStatus.CONFIRMED);

      // Confirmed to Cancelled
      updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { status: RegistrationStatus.CANCELLED },
      });
      expect(updated.status).toBe(RegistrationStatus.CANCELLED);
    });

    it('should update displayName', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const registration = await createRegistration(prisma, user.id, tournament.id);

      const updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { displayName: 'Updated Display Name' },
      });

      expect(updated.displayName).toBe('Updated Display Name');
    });

    it('should update eventId', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event1 = await createEvent(prisma, tournament.id, { name: 'Event 1' });
      const event2 = await createEvent(prisma, tournament.id, { name: 'Event 2' });

      const registration = await createRegistration(prisma, user.id, tournament.id, {
        eventId: event1.id,
      });

      const updated = await prisma.registration.update({
        where: { id: registration.id },
        data: { eventId: event2.id },
      });

      expect(updated.eventId).toBe(event2.id);
    });
  });

  describe('Registration Delete Operations', () => {
    it('should delete registration', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const registration = await createRegistration(prisma, user.id, tournament.id);

      await prisma.registration.delete({
        where: { id: registration.id },
      });

      const found = await prisma.registration.findUnique({
        where: { id: registration.id },
      });

      expect(found).toBeNull();
    });

    it('should delete registration without affecting user', async () => {
      const user = await createUser(prisma, { discordId: 'discord-preserve' });
      const tournament = await createTournament(prisma);
      const registration = await createRegistration(prisma, user.id, tournament.id);

      await prisma.registration.delete({
        where: { id: registration.id },
      });

      const userStillExists = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(userStillExists).not.toBeNull();
      expect(userStillExists?.discordId).toBe('discord-preserve');
    });

    it('should delete registration without affecting tournament', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma, {
        startggId: 'startgg-preserve',
        name: 'Preserve Tournament',
      });
      const registration = await createRegistration(prisma, user.id, tournament.id);

      await prisma.registration.delete({
        where: { id: registration.id },
      });

      const tournamentStillExists = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });

      expect(tournamentStillExists).not.toBeNull();
      expect(tournamentStillExists?.name).toBe('Preserve Tournament');
    });

    it('should cascade delete registrations when tournament deleted', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);

      await createRegistration(prisma, user.id, tournament.id);
      await createRegistration(prisma, user.id, tournament.id);

      // Verify registrations exist
      const regsBefore = await prisma.registration.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(regsBefore.length).toBe(2);

      // Delete tournament
      await prisma.tournament.delete({
        where: { id: tournament.id },
      });

      // Verify registrations are deleted
      const regsAfter = await prisma.registration.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(regsAfter.length).toBe(0);
    });

    it('should handle delete of non-existent registration gracefully', async () => {
      await expect(
        prisma.registration.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('Registration Relationships', () => {
    it('should verify user relation', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-verify',
        displayName: 'Verify User',
      });
      const tournament = await createTournament(prisma);

      const registration = await createRegistration(prisma, user.id, tournament.id);

      const found = await prisma.registration.findUnique({
        where: { id: registration.id },
        include: { user: true },
      });

      expect(found?.user).not.toBeNull();
      expect(found?.user.id).toBe(user.id);
      expect(found?.user.displayName).toBe('Verify User');
    });

    it('should verify tournament relation', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma, {
        name: 'Verify Tournament',
      });

      const registration = await createRegistration(prisma, user.id, tournament.id);

      const found = await prisma.registration.findUnique({
        where: { id: registration.id },
        include: { tournament: true },
      });

      expect(found?.tournament).not.toBeNull();
      expect(found?.tournament.id).toBe(tournament.id);
      expect(found?.tournament.name).toBe('Verify Tournament');
    });

    it('should verify event relation', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, { name: 'Verify Event' });

      const registration = await createRegistration(prisma, user.id, tournament.id, {
        eventId: event.id,
      });

      const found = await prisma.registration.findUnique({
        where: { id: registration.id },
        include: { event: true },
      });

      expect(found?.event).not.toBeNull();
      expect(found?.event.id).toBe(event.id);
      expect(found?.event.name).toBe('Verify Event');
    });

    it('should set userId to null when user deleted (SetNull)', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });

      const user = await testPrisma.user.create({
        data: { discordId: 'discord-setnull', displayName: 'SetNull User' },
      });
      const tournament = await testPrisma.tournament.create({
        data: { startggId: 'startgg-setnull', startggSlug: 'setnull', name: 'SetNull Tournament' },
      });

      const registration = await testPrisma.registration.create({
        data: { userId: user.id, tournamentId: tournament.id },
      });

      // Verify registration exists with user
      let reg = await testPrisma.registration.findUnique({ where: { id: registration.id } });
      expect(reg?.userId).toBe(user.id);

      // Delete user
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify userId is now null
      reg = await testPrisma.registration.findUnique({ where: { id: registration.id } });
      expect(reg?.userId).toBeNull();

      await testPrisma.$disconnect();
    });
  });
});
