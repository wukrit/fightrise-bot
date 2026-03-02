/**
 * Integration tests for MatchPlayer model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and relationship operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createTestPrisma,
  clearDatabase
  createTestPrisma,
  clearDatabase
  createUser,
  createTournament,
  createEvent,
  createMatch,
  createMatchPlayer,
  createCheckedInPlayer,
} from '../utils/seeders';
import { createTestPrisma, clearDatabase } from '../utils/test-setup';

import type { MatchPlayer } from '@prisma/client';

describe('MatchPlayer Model Integration Tests', () => {
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

  describe('MatchPlayer Create Operations', () => {
    it('should create matchPlayer linked to match and user', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await prisma.matchPlayer.create({
        data: {
          matchId: match.id,
          userId: user.id,
          startggEntrantId: 'entrant-12345',
          playerName: 'TestPlayer',
        },
      });

      expect(player.id).toBeDefined();
      expect(player.matchId).toBe(match.id);
      expect(player.userId).toBe(user.id);
      expect(player.startggEntrantId).toBe('entrant-12345');
      expect(player.playerName).toBe('TestPlayer');
      expect(player.isCheckedIn).toBe(false);
      expect(player.isWinner).toBeNull();
      expect(player.createdAt).toBeInstanceOf(Date);
      expect(player.updatedAt).toBeInstanceOf(Date);
    });

    it('should create matchPlayer using factory helper', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'FactoryPlayer',
        userId: user.id,
      });

      expect(player.id).toBeDefined();
      expect(player.playerName).toBe('FactoryPlayer');
      expect(player.matchId).toBe(match.id);
    });

    it('should create matchPlayer without user (ghost player)', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'GhostPlayer',
        startggEntrantId: 'entrant-ghost',
      });

      expect(player.id).toBeDefined();
      expect(player.playerName).toBe('GhostPlayer');
      expect(player.userId).toBeNull();
    });

    it('should create player with checked-in status', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createCheckedInPlayer(prisma, match.id, {
        playerName: 'CheckedInPlayer',
        userId: user.id,
      });

      expect(player.isCheckedIn).toBe(true);
      expect(player.checkedInAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on matchId + startggEntrantId', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      await createMatchPlayer(prisma, match.id, {
        startggEntrantId: 'duplicate-entrant',
        playerName: 'Player 1',
      });

      // Should throw unique constraint violation
      await expect(
        createMatchPlayer(prisma, match.id, {
          startggEntrantId: 'duplicate-entrant',
          playerName: 'Player 2',
        })
      ).rejects.toThrow();
    });
  });

  describe('MatchPlayer Read Operations', () => {
    it('should find players by match', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user1 = await createUser(prisma);
      const user2 = await createUser(prisma);

      await createMatchPlayer(prisma, match.id, { playerName: 'Player 1', userId: user1.id });
      await createMatchPlayer(prisma, match.id, { playerName: 'Player 2', userId: user2.id });

      const players = await prisma.matchPlayer.findMany({
        where: { matchId: match.id },
      });

      expect(players.length).toBe(2);
    });

    it('should find player by user', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'FindMe',
        userId: user.id,
      });

      const found = await prisma.matchPlayer.findFirst({
        where: { userId: user.id },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(player.id);
    });

    it('should include match relation when querying', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'RelatedPlayer',
        userId: user.id,
      });

      const playerWithMatch = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
        include: { match: true },
      });

      expect(playerWithMatch?.match).not.toBeNull();
      expect(playerWithMatch?.match.identifier).toBe('A1');
    });

    it('should include user relation when querying', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma, { displayName: 'TestUser' });

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'LinkedPlayer',
        userId: user.id,
      });

      const playerWithUser = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
        include: { user: true },
      });

      expect(playerWithUser?.user).not.toBeNull();
      expect(playerWithUser?.user?.displayName).toBe('TestUser');
    });

    it('should filter players by isCheckedIn', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user1 = await createUser(prisma);
      const user2 = await createUser(prisma);

      await createMatchPlayer(prisma, match.id, { playerName: 'NotChecked', userId: user1.id });
      await createCheckedInPlayer(prisma, match.id, { playerName: 'CheckedIn', userId: user2.id });

      const checkedIn = await prisma.matchPlayer.findMany({
        where: { isCheckedIn: true },
      });

      expect(checkedIn.length).toBe(1);
      expect(checkedIn[0].playerName).toBe('CheckedIn');
    });
  });

  describe('MatchPlayer Update Operations', () => {
    it('should update isCheckedIn status', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const updated = await prisma.matchPlayer.update({
        where: { id: player.id },
        data: { isCheckedIn: true, checkedInAt: new Date() },
      });

      expect(updated.isCheckedIn).toBe(true);
      expect(updated.checkedInAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        player.updatedAt.getTime()
      );
    });

    it('should update reportedScore', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const updated = await prisma.matchPlayer.update({
        where: { id: player.id },
        data: { reportedScore: 2 },
      });

      expect(updated.reportedScore).toBe(2);
    });

    it('should update isWinner', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'Winner',
        userId: user.id,
      });

      const updated = await prisma.matchPlayer.update({
        where: { id: player.id },
        data: { isWinner: true },
      });

      expect(updated.isWinner).toBe(true);
    });

    it('should update playerName', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'OldName',
        userId: user.id,
      });

      const updated = await prisma.matchPlayer.update({
        where: { id: player.id },
        data: { playerName: 'NewName' },
      });

      expect(updated.playerName).toBe('NewName');
    });

    it('should link player to user after creation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      // Create without user (ghost player)
      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'GhostPlayer',
      });

      expect(player.userId).toBeNull();

      // Later link to user
      const user = await createUser(prisma);
      const updated = await prisma.matchPlayer.update({
        where: { id: player.id },
        data: { userId: user.id },
      });

      expect(updated.userId).toBe(user.id);
    });
  });

  describe('MatchPlayer Delete Operations', () => {
    it('should delete player without affecting match', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'ToDelete',
        userId: user.id,
      });

      await prisma.matchPlayer.delete({
        where: { id: player.id },
      });

      // Verify player is deleted
      const found = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
      });
      expect(found).toBeNull();

      // Verify match still exists
      const matchStillExists = await prisma.match.findUnique({
        where: { id: match.id },
      });
      expect(matchStillExists).not.toBeNull();
      expect(matchStillExists?.identifier).toBe('A1');
    });

    it('should handle delete of non-existent player gracefully', async () => {
      await expect(
        prisma.matchPlayer.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });

    it('should not delete user when player deleted (SetNull)', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma, { displayName: 'UserToKeep' });

      await createMatchPlayer(prisma, match.id, {
        playerName: 'LinkedPlayer',
        userId: user.id,
      });

      // Get match player ID first
      const player = await prisma.matchPlayer.findFirst({
        where: { userId: user.id },
      });

      // Delete player
      await prisma.matchPlayer.delete({
        where: { id: player!.id },
      });

      // Verify user still exists (SetNull relation)
      const userStillExists = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(userStillExists).not.toBeNull();
      expect(userStillExists?.displayName).toBe('UserToKeep');
    });
  });

  describe('MatchPlayer Match Relationship', () => {
    it('should verify match relation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'RelatedPlayer',
        userId: user.id,
      });

      const found = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
        include: { match: true },
      });

      expect(found?.match).not.toBeNull();
      expect(found?.match.identifier).toBe('A1');
    });

    it('should query player with games', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'PlayerWithGames',
        userId: user.id,
      });

      // Create game results for player
      await prisma.gameResult.createMany({
        data: [
          { matchId: match.id, matchPlayerId: player.id, gameNumber: 1 },
          { matchId: match.id, matchPlayerId: player.id, gameNumber: 2 },
          { matchId: match.id, matchPlayerId: player.id, gameNumber: 3 },
        ],
      });

      const playerWithGames = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
        include: { games: true },
      });

      expect(playerWithGames?.games).toHaveLength(3);
    });

    it('should delete player and cascade games', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'PlayerWithGames',
        userId: user.id,
      });

      // Create game results
      await prisma.gameResult.createMany({
        data: [
          { matchId: match.id, matchPlayerId: player.id, gameNumber: 1 },
          { matchId: match.id, matchPlayerId: player.id, gameNumber: 2 },
        ],
      });

      // Verify games exist
      const gamesBefore = await prisma.gameResult.findMany({
        where: { matchPlayerId: player.id },
      });
      expect(gamesBefore.length).toBe(2);

      // Delete player (cascades to games)
      await prisma.matchPlayer.delete({
        where: { id: player.id },
      });

      // Verify games are deleted
      const gamesAfter = await prisma.gameResult.findMany({
        where: { matchPlayerId: player.id },
      });
      expect(gamesAfter.length).toBe(0);
    });
  });

  describe('MatchPlayer User Relationship', () => {
    it('should verify user relation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma, { displayName: 'LinkedUser' });

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'LinkedPlayer',
        userId: user.id,
      });

      const found = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
        include: { user: true },
      });

      expect(found?.user).not.toBeNull();
      expect(found?.user?.displayName).toBe('LinkedUser');
    });
  });
});
