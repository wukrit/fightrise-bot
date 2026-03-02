/**
 * Integration tests for Tournament model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and cascade operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, TournamentState, EventState } from '@prisma/client';

import { createTournament, createActiveTournament } from '../utils/seeders';
import { createTestPrisma, clearDatabase } from '../utils/test-setup';
import type { Tournament, Event, Match } from '@prisma/client';

describe('Tournament Model Integration Tests', () => {
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

  describe('Tournament Create Operations', () => {
    it('should create tournament with required fields', async () => {
      const tournament = await prisma.tournament.create({
        data: {
          startggId: 'startgg-12345',
          startggSlug: 'test-tournament',
          name: 'Test Tournament',
        },
      });

      expect(tournament.id).toBeDefined();
      expect(tournament.startggId).toBe('startgg-12345');
      expect(tournament.startggSlug).toBe('test-tournament');
      expect(tournament.name).toBe('Test Tournament');
      expect(tournament.state).toBe(TournamentState.CREATED);
      expect(tournament.createdAt).toBeInstanceOf(Date);
      expect(tournament.updatedAt).toBeInstanceOf(Date);
    });

    it('should create tournament with all settings', async () => {
      const startDate = new Date('2025-01-15T10:00:00Z');
      const endDate = new Date('2025-01-15T20:00:00Z');

      const tournament = await prisma.tournament.create({
        data: {
          startggId: 'startgg-full-settings',
          startggSlug: 'full-settings-tournament',
          name: 'Full Settings Tournament',
          startAt: startDate,
          endAt: endDate,
          state: TournamentState.REGISTRATION_OPEN,
          discordGuildId: 'guild-12345',
          discordChannelId: 'channel-67890',
          autoCreateThreads: true,
          requireCheckIn: true,
          checkInWindowMinutes: 15,
          allowSelfReporting: false,
        },
      });

      expect(tournament.startAt).toEqual(startDate);
      expect(tournament.endAt).toEqual(endDate);
      expect(tournament.state).toBe(TournamentState.REGISTRATION_OPEN);
      expect(tournament.discordGuildId).toBe('guild-12345');
      expect(tournament.discordChannelId).toBe('channel-67890');
      expect(tournament.autoCreateThreads).toBe(true);
      expect(tournament.requireCheckIn).toBe(true);
      expect(tournament.checkInWindowMinutes).toBe(15);
      expect(tournament.allowSelfReporting).toBe(false);
    });

    it('should create tournament using factory helper', async () => {
      const tournament = await createTournament(prisma, {
        name: 'Factory Tournament',
        state: TournamentState.IN_PROGRESS,
      });

      expect(tournament.id).toBeDefined();
      expect(tournament.name).toBe('Factory Tournament');
      expect(tournament.state).toBe(TournamentState.IN_PROGRESS);
    });

    it('should create tournament with default settings', async () => {
      const tournament = await createTournament(prisma);

      expect(tournament.autoCreateThreads).toBe(true);
      expect(tournament.requireCheckIn).toBe(true);
      expect(tournament.checkInWindowMinutes).toBe(10);
      expect(tournament.allowSelfReporting).toBe(true);
      expect(tournament.pollIntervalMs).toBe(30000);
    });
  });

  describe('Tournament Read Operations', () => {
    it('should find tournament by startggId', async () => {
      const created = await createTournament(prisma, {
        startggId: 'startgg-findme',
        name: 'Find Me Tournament',
      });

      const found = await prisma.tournament.findUnique({
        where: { startggId: 'startgg-findme' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me Tournament');
    });

    it('should list tournaments by state', async () => {
      await createTournament(prisma, { state: TournamentState.CREATED });
      await createTournament(prisma, { state: TournamentState.CREATED });
      await createTournament(prisma, { state: TournamentState.IN_PROGRESS });
      await createActiveTournament(prisma);

      const created = await prisma.tournament.findMany({
        where: { state: TournamentState.CREATED },
      });

      expect(created.length).toBe(2);

      const inProgress = await prisma.tournament.findMany({
        where: { state: TournamentState.IN_PROGRESS },
      });

      expect(inProgress.length).toBe(2);
    });

    it('should list tournaments by discordGuildId', async () => {
      const guildId = 'guild-shared';

      await createTournament(prisma, {
        discordGuildId: guildId,
        name: 'Tournament 1',
      });
      await createTournament(prisma, {
        discordGuildId: guildId,
        name: 'Tournament 2',
      });
      await createTournament(prisma, {
        discordGuildId: 'other-guild',
        name: 'Other Tournament',
      });

      const tournaments = await prisma.tournament.findMany({
        where: { discordGuildId: guildId },
      });

      expect(tournaments.length).toBe(2);
    });

    it('should paginate tournament results', async () => {
      for (let i = 0; i < 15; i++) {
        await createTournament(prisma, { name: `Tournament ${i}` });
      }

      const firstPage = await prisma.tournament.findMany({
        take: 5,
        orderBy: { createdAt: 'asc' },
      });

      expect(firstPage.length).toBe(5);

      const secondPage = await prisma.tournament.findMany({
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'asc' },
      });

      expect(secondPage.length).toBe(5);
    });

    it('should include relations when querying', async () => {
      const tournament = await createTournament(prisma);
      await prisma.event.createMany({
        data: [
          { tournamentId: tournament.id, startggId: 'evt-1', name: 'Event 1', state: EventState.CREATED },
          { tournamentId: tournament.id, startggId: 'evt-2', name: 'Event 2', state: EventState.CREATED },
        ],
      });

      const tournamentWithEvents = await prisma.tournament.findUnique({
        where: { id: tournament.id },
        include: { events: true },
      });

      expect(tournamentWithEvents?.events).toHaveLength(2);
    });
  });

  describe('Tournament Update Operations', () => {
    it('should update tournament state', async () => {
      const tournament = await createTournament(prisma, {
        state: TournamentState.CREATED,
      });

      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { state: TournamentState.REGISTRATION_OPEN },
      });

      expect(updated.state).toBe(TournamentState.REGISTRATION_OPEN);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        tournament.updatedAt.getTime()
      );
    });

    it('should update tournament state through lifecycle', async () => {
      const tournament = await createTournament(prisma, {
        state: TournamentState.CREATED,
      });

      // Registration open
      let updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { state: TournamentState.REGISTRATION_OPEN },
      });
      expect(updated.state).toBe(TournamentState.REGISTRATION_OPEN);

      // Registration closed
      updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { state: TournamentState.REGISTRATION_CLOSED },
      });
      expect(updated.state).toBe(TournamentState.REGISTRATION_CLOSED);

      // In progress
      updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          state: TournamentState.IN_PROGRESS,
          startAt: new Date(),
        },
      });
      expect(updated.state).toBe(TournamentState.IN_PROGRESS);

      // Completed
      updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          state: TournamentState.COMPLETED,
          endAt: new Date(),
        },
      });
      expect(updated.state).toBe(TournamentState.COMPLETED);
    });

    it('should update discord settings', async () => {
      const tournament = await createTournament(prisma);

      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          discordGuildId: 'new-guild-id',
          discordChannelId: 'new-channel-id',
        },
      });

      expect(updated.discordGuildId).toBe('new-guild-id');
      expect(updated.discordChannelId).toBe('new-channel-id');
    });

    it('should update check-in settings', async () => {
      const tournament = await createTournament(prisma, {
        requireCheckIn: false,
        checkInWindowMinutes: 10,
      });

      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          requireCheckIn: true,
          checkInWindowMinutes: 30,
        },
      });

      expect(updated.requireCheckIn).toBe(true);
      expect(updated.checkInWindowMinutes).toBe(30);
    });

    it('should update polling interval', async () => {
      const tournament = await createTournament(prisma);

      const updated = await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          lastPolledAt: new Date(),
          pollIntervalMs: 60000,
        },
      });

      expect(updated.lastPolledAt).toBeInstanceOf(Date);
      expect(updated.pollIntervalMs).toBe(60000);
    });
  });

  describe('Tournament Delete Operations', () => {
    it('should delete tournament', async () => {
      const tournament = await createTournament(prisma, {
        name: 'To Delete',
      });

      await prisma.tournament.delete({
        where: { id: tournament.id },
      });

      const found = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete events when tournament deleted', async () => {
      const tournament = await createTournament(prisma);

      // Create events with proper EventState
      await prisma.event.createMany({
        data: [
          { tournamentId: tournament.id, startggId: 'cascade-evt-1', name: 'Event 1', state: EventState.CREATED },
          { tournamentId: tournament.id, startggId: 'cascade-evt-2', name: 'Event 2', state: EventState.CREATED },
        ],
      });

      // Verify events exist
      const eventsBefore = await prisma.event.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(eventsBefore.length).toBe(2);

      // Delete tournament
      await prisma.tournament.delete({
        where: { id: tournament.id },
      });

      // Verify events are deleted (cascade)
      const eventsAfter = await prisma.event.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(eventsAfter.length).toBe(0);
    });

    it('should cascade delete registrations when tournament deleted', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });

      const tournament = await createTournament(prisma);
      const user = await testPrisma.user.create({
        data: {
          discordId: 'discord-cascade-reg',
          displayName: 'Test User',
        },
      });

      await testPrisma.registration.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
          status: 'CONFIRMED',
        },
      });

      // Verify registration exists
      const regsBefore = await prisma.registration.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(regsBefore.length).toBe(1);

      // Delete tournament
      await prisma.tournament.delete({
        where: { id: tournament.id },
      });

      // Verify registrations are deleted
      const regsAfter = await prisma.registration.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(regsAfter.length).toBe(0);

      await testPrisma.$disconnect();
    });

    it('should handle delete of non-existent tournament gracefully', async () => {
      await expect(
        prisma.tournament.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('Tournament Events Relationship', () => {
    it('should create events for tournament', async () => {
      const tournament = await createTournament(prisma);

      const event1 = await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'sf6-event',
          name: 'Street Fighter 6',
          numEntrants: 32,
          state: EventState.CREATED,
        },
      });

      const event2 = await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'tekken8-event',
          name: 'Tekken 8',
          numEntrants: 16,
          state: EventState.CREATED,
        },
      });

      expect(event1.tournamentId).toBe(tournament.id);
      expect(event2.tournamentId).toBe(tournament.id);
    });

    it('should query events with tournament relation', async () => {
      const tournament = await createTournament(prisma);
      await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'query-evt-a',
          name: 'Event A',
          state: EventState.CREATED,
        },
      });

      const events = await prisma.event.findMany({
        where: { tournamentId: tournament.id },
        include: { tournament: true },
      });

      expect(events.length).toBe(1);
      expect(events[0].tournament.id).toBe(tournament.id);
      expect(events[0].tournament.name).toBe(tournament.name);
    });

    it('should cascade delete matches when event deleted', async () => {
      const tournament = await createTournament(prisma);
      const event = await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'cascade-match-evt',
          name: 'Test Event',
          state: EventState.CREATED,
        },
      });

      const match = await prisma.match.create({
        data: {
          eventId: event.id,
          startggSetId: 'test-set-cascade',
          identifier: 'A1',
          roundText: 'Round 1',
          round: 1,
        },
      });

      // Verify match exists
      const matchesBefore = await prisma.match.findMany({
        where: { eventId: event.id },
      });
      expect(matchesBefore.length).toBe(1);

      // Delete event
      await prisma.event.delete({
        where: { id: event.id },
      });

      // Verify match is deleted
      const matchesAfter = await prisma.match.findMany({
        where: { eventId: event.id },
      });
      expect(matchesAfter.length).toBe(0);
    });
  });

  describe('Tournament Registrations Relationship', () => {
    it('should include registrations when querying tournament', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });

      const tournament = await createTournament(prisma);
      const user1 = await testPrisma.user.create({
        data: { discordId: 'discord-reg-1', displayName: 'User 1' },
      });
      const user2 = await testPrisma.user.create({
        data: { discordId: 'discord-reg-2', displayName: 'User 2' },
      });

      await testPrisma.registration.createMany({
        data: [
          { userId: user1.id, tournamentId: tournament.id, status: 'CONFIRMED' },
          { userId: user2.id, tournamentId: tournament.id, status: 'PENDING' },
        ],
      });

      const tournamentWithRegs = await prisma.tournament.findUnique({
        where: { id: tournament.id },
        include: { registrations: true },
      });

      expect(tournamentWithRegs?.registrations).toHaveLength(2);

      await testPrisma.$disconnect();
    });
  });
});
