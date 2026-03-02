/**
 * Integration tests for Event model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and cascade operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, EventState } from '@prisma/client';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';
import { createTournament, createEvent } from '../utils/seeders';
import { getTestDatabaseUrl } from '../utils/test-env';
import type { Event } from '@prisma/client';

describe('Event Model Integration Tests', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    const setup = await setupTestDatabase(getTestDatabaseUrl());
    prisma = setup.prisma;
    databaseUrl = setup.databaseUrl;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase(prisma);
  });

  describe('Event Create Operations', () => {
    it('should create event with required fields', async () => {
      const tournament = await createTournament(prisma);

      const event = await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'startgg-event-12345',
          name: 'Street Fighter 6',
        },
      });

      expect(event.id).toBeDefined();
      expect(event.startggId).toBe('startgg-event-12345');
      expect(event.name).toBe('Street Fighter 6');
      expect(event.numEntrants).toBe(0);
      expect(event.state).toBe(EventState.CREATED);
      expect(event.tournamentId).toBe(tournament.id);
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.updatedAt).toBeInstanceOf(Date);
    });

    it('should create event with all fields', async () => {
      const tournament = await createTournament(prisma);

      const event = await prisma.event.create({
        data: {
          tournamentId: tournament.id,
          startggId: 'startgg-event-full',
          name: 'Tekken 8',
          numEntrants: 64,
          state: EventState.ACTIVE,
        },
      });

      expect(event.numEntrants).toBe(64);
      expect(event.state).toBe(EventState.ACTIVE);
    });

    it('should create event using factory helper', async () => {
      const tournament = await createTournament(prisma);

      const event = await createEvent(prisma, tournament.id, {
        name: 'Factory Event',
        numEntrants: 32,
        state: EventState.ACTIVE,
      });

      expect(event.id).toBeDefined();
      expect(event.name).toBe('Factory Event');
      expect(event.numEntrants).toBe(32);
      expect(event.state).toBe(EventState.ACTIVE);
    });

    it('should create multiple events for same tournament', async () => {
      const tournament = await createTournament(prisma);

      const event1 = await createEvent(prisma, tournament.id, {
        name: 'Street Fighter 6',
        numEntrants: 32,
      });

      const event2 = await createEvent(prisma, tournament.id, {
        name: 'Tekken 8',
        numEntrants: 16,
      });

      expect(event1.tournamentId).toBe(tournament.id);
      expect(event2.tournamentId).toBe(tournament.id);
      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('Event Read Operations', () => {
    it('should find event by startggId', async () => {
      const tournament = await createTournament(prisma);
      const created = await createEvent(prisma, tournament.id, {
        startggId: 'startgg-findme',
        name: 'Find Me Event',
      });

      const found = await prisma.event.findUnique({
        where: { startggId: 'startgg-findme' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me Event');
    });

    it('should list events by tournament', async () => {
      const tournament = await createTournament(prisma);

      await createEvent(prisma, tournament.id, { name: 'Event 1' });
      await createEvent(prisma, tournament.id, { name: 'Event 2' });
      await createEvent(prisma, tournament.id, { name: 'Event 3' });

      const events = await prisma.event.findMany({
        where: { tournamentId: tournament.id },
      });

      expect(events.length).toBe(3);
    });

    it('should list events by state', async () => {
      const tournament = await createTournament(prisma);

      await createEvent(prisma, tournament.id, {
        name: 'Created Event',
        state: EventState.CREATED,
      });
      await createEvent(prisma, tournament.id, {
        name: 'Active Event',
        state: EventState.ACTIVE,
      });
      await createEvent(prisma, tournament.id, {
        name: 'Another Active',
        state: EventState.ACTIVE,
      });

      const created = await prisma.event.findMany({
        where: { state: EventState.CREATED },
      });

      expect(created.length).toBe(1);

      const active = await prisma.event.findMany({
        where: { state: EventState.ACTIVE },
      });

      expect(active.length).toBe(2);
    });

    it('should include tournament relation when querying', async () => {
      const tournament = await createTournament(prisma, {
        name: 'Parent Tournament',
      });

      const event = await createEvent(prisma, tournament.id, {
        name: 'Child Event',
      });

      const eventWithTournament = await prisma.event.findUnique({
        where: { id: event.id },
        include: { tournament: true },
      });

      expect(eventWithTournament?.tournament).not.toBeNull();
      expect(eventWithTournament?.tournament.id).toBe(tournament.id);
      expect(eventWithTournament?.tournament.name).toBe('Parent Tournament');
    });

    it('should filter events by numEntrants', async () => {
      const tournament = await createTournament(prisma);

      await createEvent(prisma, tournament.id, { numEntrants: 8 });
      await createEvent(prisma, tournament.id, { numEntrants: 16 });
      await createEvent(prisma, tournament.id, { numEntrants: 32 });

      const largeEvents = await prisma.event.findMany({
        where: { numEntrants: { gte: 16 } },
      });

      expect(largeEvents.length).toBe(2);
    });
  });

  describe('Event Update Operations', () => {
    it('should update event name', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, {
        name: 'Old Name',
      });

      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { name: 'New Name' },
      });

      expect(updated.name).toBe('New Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        event.updatedAt.getTime()
      );
    });

    it('should update event numEntrants', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, {
        numEntrants: 0,
      });

      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { numEntrants: 64 },
      });

      expect(updated.numEntrants).toBe(64);
    });

    it('should update event state through lifecycle', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, {
        state: EventState.CREATED,
      });

      // Activate event
      let updated = await prisma.event.update({
        where: { id: event.id },
        data: { state: EventState.ACTIVE },
      });
      expect(updated.state).toBe(EventState.ACTIVE);

      // Complete event
      updated = await prisma.event.update({
        where: { id: event.id },
        data: { state: EventState.COMPLETED },
      });
      expect(updated.state).toBe(EventState.COMPLETED);
    });

    it('should update tournamentId to different tournament', async () => {
      const tournament1 = await createTournament(prisma, {
        name: 'Tournament 1',
      });
      const tournament2 = await createTournament(prisma, {
        name: 'Tournament 2',
      });

      const event = await createEvent(prisma, tournament1.id, {
        name: 'Migrating Event',
      });

      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { tournamentId: tournament2.id },
      });

      expect(updated.tournamentId).toBe(tournament2.id);
    });
  });

  describe('Event Delete Operations', () => {
    it('should delete event', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, {
        name: 'To Delete',
      });

      await prisma.event.delete({
        where: { id: event.id },
      });

      const found = await prisma.event.findUnique({
        where: { id: event.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete matches when event deleted', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id, {
        name: 'Event with Matches',
      });

      // Create matches
      await prisma.match.createMany({
        data: [
          {
            eventId: event.id,
            startggSetId: 'set-1',
            identifier: 'A1',
            roundText: 'Round 1',
            round: 1,
          },
          {
            eventId: event.id,
            startggSetId: 'set-2',
            identifier: 'A2',
            roundText: 'Round 2',
            round: 2,
          },
        ],
      });

      // Verify matches exist
      const matchesBefore = await prisma.match.findMany({
        where: { eventId: event.id },
      });
      expect(matchesBefore.length).toBe(2);

      // Delete event
      await prisma.event.delete({
        where: { id: event.id },
      });

      // Verify matches are deleted (cascade)
      const matchesAfter = await prisma.match.findMany({
        where: { eventId: event.id },
      });
      expect(matchesAfter.length).toBe(0);
    });

    it('should handle delete of non-existent event gracefully', async () => {
      await expect(
        prisma.event.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('Event Tournament Relationship', () => {
    it('should verify tournament relation', async () => {
      const tournament = await createTournament(prisma, {
        name: 'Related Tournament',
      });

      const event = await createEvent(prisma, tournament.id, {
        name: 'Related Event',
      });

      const found = await prisma.event.findUnique({
        where: { id: event.id },
        include: { tournament: true },
      });

      expect(found?.tournament).not.toBeNull();
      expect(found?.tournament.name).toBe('Related Tournament');
    });

    it('should cascade delete when tournament deleted', async () => {
      const tournament = await createTournament(prisma);

      await createEvent(prisma, tournament.id, { name: 'Event 1' });
      await createEvent(prisma, tournament.id, { name: 'Event 2' });

      // Verify events exist
      const eventsBefore = await prisma.event.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(eventsBefore.length).toBe(2);

      // Delete tournament (cascades to events)
      await prisma.tournament.delete({
        where: { id: tournament.id },
      });

      // Verify events are deleted
      const eventsAfter = await prisma.event.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(eventsAfter.length).toBe(0);
    });

    it('should query event with matches relation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      await prisma.match.create({
        data: {
          eventId: event.id,
          startggSetId: 'match-with-event',
          identifier: 'A1',
          roundText: 'Round 1',
          round: 1,
        },
      });

      const eventWithMatches = await prisma.event.findUnique({
        where: { id: event.id },
        include: { matches: true },
      });

      expect(eventWithMatches?.matches).toHaveLength(1);
      expect(eventWithMatches?.matches[0].eventId).toBe(event.id);
    });
  });
});
