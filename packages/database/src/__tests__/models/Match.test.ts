/**
 * Integration tests for Match model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and cascade operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, MatchState, StartggSyncStatus } from '@prisma/client';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';
import { createTournament, createEvent, createMatch, createMatchPlayer, createUser } from '../utils/seeders';
import type { Match } from '@prisma/client';

describe('Match Model Integration Tests', () => {
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

  describe('Match Create Operations', () => {
    it('should create match linked to event', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      const match = await prisma.match.create({
        data: {
          eventId: event.id,
          startggSetId: 'startgg-set-12345',
          identifier: 'A1',
          roundText: 'Winners Round 1',
          round: 1,
        },
      });

      expect(match.id).toBeDefined();
      expect(match.startggSetId).toBe('startgg-set-12345');
      expect(match.identifier).toBe('A1');
      expect(match.roundText).toBe('Winners Round 1');
      expect(match.round).toBe(1);
      expect(match.state).toBe(MatchState.NOT_STARTED);
      expect(match.eventId).toBe(event.id);
      expect(match.createdAt).toBeInstanceOf(Date);
      expect(match.updatedAt).toBeInstanceOf(Date);
    });

    it('should create match using factory helper', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      const match = await createMatch(prisma, event.id, {
        identifier: 'B1',
        roundText: 'Losers Round 1',
        round: 1,
        state: MatchState.CALLED,
      });

      expect(match.id).toBeDefined();
      expect(match.identifier).toBe('B1');
      expect(match.state).toBe(MatchState.CALLED);
    });

    it('should create match with Discord thread info', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      const match = await createMatch(prisma, event.id, {
        discordThreadId: 'discord-thread-12345',
      });

      expect(match.discordThreadId).toBe('discord-thread-12345');
    });

    it('should create match with check-in deadline', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const deadline = new Date(Date.now() + 600000); // 10 minutes from now

      const match = await createMatch(prisma, event.id, {
        checkInDeadline: deadline,
      });

      expect(match.checkInDeadline).toBeInstanceOf(Date);
      expect(match.checkInDeadline!.getTime()).toBe(deadline.getTime());
    });

    it('should create multiple matches for same event', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      const match1 = await createMatch(prisma, event.id, { identifier: 'A1', round: 1 });
      const match2 = await createMatch(prisma, event.id, { identifier: 'A2', round: 1 });
      const match3 = await createMatch(prisma, event.id, { identifier: 'B1', round: 2 });

      expect(match1.eventId).toBe(event.id);
      expect(match2.eventId).toBe(event.id);
      expect(match3.eventId).toBe(event.id);
      expect(match1.id).not.toBe(match2.id);
      expect(match2.id).not.toBe(match3.id);
    });
  });

  describe('Match Read Operations', () => {
    it('should find match by startggSetId', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const created = await createMatch(prisma, event.id, {
        startggSetId: 'startgg-findme',
        identifier: 'A1',
      });

      const found = await prisma.match.findUnique({
        where: { startggSetId: 'startgg-findme' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.identifier).toBe('A1');
    });

    it('should list matches by event', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      await createMatch(prisma, event.id, { identifier: 'A1', round: 1 });
      await createMatch(prisma, event.id, { identifier: 'A2', round: 1 });
      await createMatch(prisma, event.id, { identifier: 'B1', round: 2 });

      const matches = await prisma.match.findMany({
        where: { eventId: event.id },
      });

      expect(matches.length).toBe(3);
    });

    it('should list matches by state', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      await createMatch(prisma, event.id, { state: MatchState.NOT_STARTED });
      await createMatch(prisma, event.id, { state: MatchState.CALLED });
      await createMatch(prisma, event.id, { state: MatchState.CALLED });
      await createMatch(prisma, event.id, { state: MatchState.COMPLETED });

      const notStarted = await prisma.match.findMany({
        where: { state: MatchState.NOT_STARTED },
      });
      expect(notStarted.length).toBe(1);

      const called = await prisma.match.findMany({
        where: { state: MatchState.CALLED },
      });
      expect(called.length).toBe(2);

      const completed = await prisma.match.findMany({
        where: { state: MatchState.COMPLETED },
      });
      expect(completed.length).toBe(1);
    });

    it('should include event relation when querying', async () => {
      const tournament = await createTournament(prisma, { name: 'Parent Tournament' });
      const event = await createEvent(prisma, tournament.id, { name: 'Child Event' });

      const match = await createMatch(prisma, event.id, { identifier: 'A1' });

      const matchWithEvent = await prisma.match.findUnique({
        where: { id: match.id },
        include: { event: true },
      });

      expect(matchWithEvent?.event).not.toBeNull();
      expect(matchWithEvent?.event.id).toBe(event.id);
      expect(matchWithEvent?.event.name).toBe('Child Event');
    });

    it('should query match with players relation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const user = await createUser(prisma);

      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 1',
        userId: user.id,
      });
      await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 2',
      });

      const matchWithPlayers = await prisma.match.findUnique({
        where: { id: match.id },
        include: { players: true },
      });

      expect(matchWithPlayers?.players).toHaveLength(2);
    });

    it('should filter matches by round', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      await createMatch(prisma, event.id, { round: 1 });
      await createMatch(prisma, event.id, { round: 1 });
      await createMatch(prisma, event.id, { round: 2 });
      await createMatch(prisma, event.id, { round: 3 });

      const round1Matches = await prisma.match.findMany({
        where: { round: 1 },
      });

      expect(round1Matches.length).toBe(2);
    });
  });

  describe('Match Update Operations', () => {
    it('should update match state', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { state: MatchState.NOT_STARTED });

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: { state: MatchState.CALLED },
      });

      expect(updated.state).toBe(MatchState.CALLED);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        match.updatedAt.getTime()
      );
    });

    it('should update discordThreadId', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: { discordThreadId: 'discord-thread-update' },
      });

      expect(updated.discordThreadId).toBe('discord-thread-update');
    });

    it('should update through match lifecycle', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, {
        state: MatchState.NOT_STARTED,
      });

      // Called state
      let updated = await prisma.match.update({
        where: { id: match.id },
        data: { state: MatchState.CALLED },
      });
      expect(updated.state).toBe(MatchState.CALLED);

      // Checked in state
      updated = await prisma.match.update({
        where: { id: match.id },
        data: { state: MatchState.CHECKED_IN },
      });
      expect(updated.state).toBe(MatchState.CHECKED_IN);

      // In progress state
      updated = await prisma.match.update({
        where: { id: match.id },
        data: { state: MatchState.IN_PROGRESS },
      });
      expect(updated.state).toBe(MatchState.IN_PROGRESS);

      // Completed state
      updated = await prisma.match.update({
        where: { id: match.id },
        data: { state: MatchState.COMPLETED },
      });
      expect(updated.state).toBe(MatchState.COMPLETED);
    });

    it('should update startggSyncStatus', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: { startggSyncStatus: StartggSyncStatus.SYNCED },
      });

      expect(updated.startggSyncStatus).toBe(StartggSyncStatus.SYNCED);
    });

    it('should update checkInDeadline', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const newDeadline = new Date(Date.now() + 900000); // 15 minutes from now

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: { checkInDeadline: newDeadline },
      });

      expect(updated.checkInDeadline!.getTime()).toBe(newDeadline.getTime());
    });

    it('should update identifier and roundText', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, {
        identifier: 'A1',
        roundText: 'Round 1',
      });

      const updated = await prisma.match.update({
        where: { id: match.id },
        data: { identifier: 'GF', roundText: 'Grand Finals' },
      });

      expect(updated.identifier).toBe('GF');
      expect(updated.roundText).toBe('Grand Finals');
    });
  });

  describe('Match Delete Operations', () => {
    it('should delete match', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'To Delete' });

      await prisma.match.delete({
        where: { id: match.id },
      });

      const found = await prisma.match.findUnique({
        where: { id: match.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete players when match deleted', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const user = await createUser(prisma);

      const match = await createMatch(prisma, event.id);
      await createMatchPlayer(prisma, match.id, { playerName: 'Player 1', userId: user.id });
      await createMatchPlayer(prisma, match.id, { playerName: 'Player 2' });

      // Verify players exist
      const playersBefore = await prisma.matchPlayer.findMany({
        where: { matchId: match.id },
      });
      expect(playersBefore.length).toBe(2);

      // Delete match
      await prisma.match.delete({
        where: { id: match.id },
      });

      // Verify players are deleted (cascade)
      const playersAfter = await prisma.matchPlayer.findMany({
        where: { matchId: match.id },
      });
      expect(playersAfter.length).toBe(0);
    });

    it('should cascade delete games when match deleted', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      const match = await createMatch(prisma, event.id);
      const player1 = await createMatchPlayer(prisma, match.id, { playerName: 'Player 1' });
      const player2 = await createMatchPlayer(prisma, match.id, { playerName: 'Player 2' });

      // Create game results
      await prisma.gameResult.createMany({
        data: [
          {
            matchId: match.id,
            matchPlayerId: player1.id,
            gameNumber: 1,
            winnerId: player1.id,
          },
          {
            matchId: match.id,
            matchPlayerId: player2.id,
            gameNumber: 2,
            winnerId: player2.id,
          },
        ],
      });

      // Verify games exist
      const gamesBefore = await prisma.gameResult.findMany({
        where: { matchId: match.id },
      });
      expect(gamesBefore.length).toBe(2);

      // Delete match
      await prisma.match.delete({
        where: { id: match.id },
      });

      // Verify games are deleted (cascade)
      const gamesAfter = await prisma.gameResult.findMany({
        where: { matchId: match.id },
      });
      expect(gamesAfter.length).toBe(0);
    });

    it('should handle delete of non-existent match gracefully', async () => {
      await expect(
        prisma.match.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('Match Event Relationship', () => {
    it('should verify event relation', async () => {
      const tournament = await createTournament(prisma, { name: 'Related Tournament' });
      const event = await createEvent(prisma, tournament.id, { name: 'Related Event' });

      const match = await createMatch(prisma, event.id, { identifier: 'A1' });

      const found = await prisma.match.findUnique({
        where: { id: match.id },
        include: { event: true },
      });

      expect(found?.event).not.toBeNull();
      expect(found?.event.name).toBe('Related Event');
    });

    it('should cascade delete when event deleted', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      await createMatch(prisma, event.id, { identifier: 'A1' });
      await createMatch(prisma, event.id, { identifier: 'A2' });

      // Verify matches exist
      const matchesBefore = await prisma.match.findMany({
        where: { eventId: event.id },
      });
      expect(matchesBefore.length).toBe(2);

      // Delete event (cascades to matches)
      await prisma.event.delete({
        where: { id: event.id },
      });

      // Verify matches are deleted
      const matchesAfter = await prisma.match.findMany({
        where: { eventId: event.id },
      });
      expect(matchesAfter.length).toBe(0);
    });

    it('should query match with event and players', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const user = await createUser(prisma);

      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 1',
        userId: user.id,
      });

      const fullMatch = await prisma.match.findUnique({
        where: { id: match.id },
        include: {
          event: true,
          players: true,
        },
      });

      expect(fullMatch?.event).not.toBeNull();
      expect(fullMatch?.players).toHaveLength(1);
      expect(fullMatch?.event.id).toBe(event.id);
    });
  });
});
