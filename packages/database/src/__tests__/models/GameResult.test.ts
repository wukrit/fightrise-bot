/**
 * Integration tests for GameResult model CRUD operations.
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
  createGameResult,
} from '../utils/seeders';
import { createTestPrisma, clearDatabase } from '../utils/test-setup';

import type { GameResult } from '@prisma/client';

describe('GameResult Model Integration Tests', () => {
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

  describe('GameResult Create Operations', () => {
    it('should create game result linked to match and matchPlayer', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await prisma.gameResult.create({
        data: {
          matchId: match.id,
          matchPlayerId: player.id,
          gameNumber: 1,
        },
      });

      expect(game.id).toBeDefined();
      expect(game.matchId).toBe(match.id);
      expect(game.matchPlayerId).toBe(player.id);
      expect(game.gameNumber).toBe(1);
      expect(game.winnerId).toBeNull();
      expect(game.characterId).toBeNull();
      expect(game.characterName).toBeNull();
      expect(game.createdAt).toBeInstanceOf(Date);
      expect(game.updatedAt).toBeInstanceOf(Date);
    });

    it('should create game result using factory helper', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'FactoryPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, {
        gameNumber: 1,
        winnerId: player.id,
        characterName: 'Ryu',
        stageName: 'Battlefield',
      });

      expect(game.id).toBeDefined();
      expect(game.gameNumber).toBe(1);
      expect(game.winnerId).toBe(player.id);
      expect(game.characterName).toBe('Ryu');
      expect(game.stageName).toBe('Battlefield');
    });

    it('should create game result with character and stage info', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, {
        gameNumber: 1,
        winnerId: player.id,
        characterId: 'char-123',
        characterName: 'Lucina',
        stageId: 'stage-456',
        stageName: 'Final Destination',
      });

      expect(game.characterId).toBe('char-123');
      expect(game.characterName).toBe('Lucina');
      expect(game.stageId).toBe('stage-456');
      expect(game.stageName).toBe('Final Destination');
    });

    it('should create multiple game results for same match', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user1 = await createUser(prisma);
      const user2 = await createUser(prisma);

      const player1 = await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 1',
        userId: user1.id,
      });
      const player2 = await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 2',
        userId: user2.id,
      });

      await createGameResult(prisma, match.id, player1.id, { gameNumber: 1, winnerId: player1.id });
      await createGameResult(prisma, match.id, player2.id, { gameNumber: 2, winnerId: player2.id });
      await createGameResult(prisma, match.id, player1.id, { gameNumber: 3, winnerId: player1.id });

      const games = await prisma.gameResult.findMany({
        where: { matchId: match.id },
      });

      expect(games.length).toBe(3);
    });

    it('should enforce unique constraint on matchPlayerId + gameNumber', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      // Should throw unique constraint violation
      await expect(
        createGameResult(prisma, match.id, player.id, { gameNumber: 1 })
      ).rejects.toThrow();
    });
  });

  describe('GameResult Read Operations', () => {
    it('should find games by matchPlayer', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });
      await createGameResult(prisma, match.id, player.id, { gameNumber: 2 });
      await createGameResult(prisma, match.id, player.id, { gameNumber: 3 });

      const games = await prisma.gameResult.findMany({
        where: { matchPlayerId: player.id },
      });

      expect(games.length).toBe(3);
    });

    it('should list games by match', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user1 = await createUser(prisma);
      const user2 = await createUser(prisma);

      const player1 = await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 1',
        userId: user1.id,
      });
      const player2 = await createMatchPlayer(prisma, match.id, {
        playerName: 'Player 2',
        userId: user2.id,
      });

      await createGameResult(prisma, match.id, player1.id, { gameNumber: 1 });
      await createGameResult(prisma, match.id, player2.id, { gameNumber: 1 });
      await createGameResult(prisma, match.id, player1.id, { gameNumber: 2 });
      await createGameResult(prisma, match.id, player2.id, { gameNumber: 2 });

      const games = await prisma.gameResult.findMany({
        where: { matchId: match.id },
      });

      expect(games.length).toBe(4);
    });

    it('should include match relation when querying', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      const gameWithMatch = await prisma.gameResult.findUnique({
        where: { id: game.id },
        include: { match: true },
      });

      expect(gameWithMatch?.match).not.toBeNull();
      expect(gameWithMatch?.match.identifier).toBe('A1');
    });

    it('should include matchPlayer relation when querying', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, {
        gameNumber: 1,
      });

      const gameWithPlayer = await prisma.gameResult.findUnique({
        where: { id: game.id },
        include: { matchPlayer: true },
      });

      expect(gameWithPlayer?.matchPlayer).not.toBeNull();
      expect(gameWithPlayer?.matchPlayer?.playerName).toBe('TestPlayer');
    });

    it('should filter games by gameNumber', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });
      await createGameResult(prisma, match.id, player.id, { gameNumber: 2 });
      await createGameResult(prisma, match.id, player.id, { gameNumber: 3 });

      const game2 = await prisma.gameResult.findFirst({
        where: { gameNumber: 2 },
      });

      expect(game2).not.toBeNull();
      expect(game2?.gameNumber).toBe(2);
    });
  });

  describe('GameResult Update Operations', () => {
    it('should update winnerId', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      const updated = await prisma.gameResult.update({
        where: { id: game.id },
        data: { winnerId: player.id },
      });

      expect(updated.winnerId).toBe(player.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        game.updatedAt.getTime()
      );
    });

    it('should update character info', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, {
        gameNumber: 1,
        characterName: 'Marth',
      });

      const updated = await prisma.gameResult.update({
        where: { id: game.id },
        data: { characterName: 'Lucina' },
      });

      expect(updated.characterName).toBe('Lucina');
    });

    it('should update stage info', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, {
        gameNumber: 1,
        stageName: 'Pokemon Stadium',
      });

      const updated = await prisma.gameResult.update({
        where: { id: game.id },
        data: { stageName: 'Smashville' },
      });

      expect(updated.stageName).toBe('Smashville');
    });

    it('should update gameNumber', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      const updated = await prisma.gameResult.update({
        where: { id: game.id },
        data: { gameNumber: 5 },
      });

      expect(updated.gameNumber).toBe(5);
    });
  });

  describe('GameResult Delete Operations', () => {
    it('should delete game without affecting match', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      await prisma.gameResult.delete({
        where: { id: game.id },
      });

      // Verify game is deleted
      const found = await prisma.gameResult.findUnique({
        where: { id: game.id },
      });
      expect(found).toBeNull();

      // Verify match still exists
      const matchStillExists = await prisma.match.findUnique({
        where: { id: match.id },
      });
      expect(matchStillExists).not.toBeNull();
      expect(matchStillExists?.identifier).toBe('A1');
    });

    it('should delete game without affecting player', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      await prisma.gameResult.delete({
        where: { id: game.id },
      });

      // Verify player still exists
      const playerStillExists = await prisma.matchPlayer.findUnique({
        where: { id: player.id },
      });
      expect(playerStillExists).not.toBeNull();
      expect(playerStillExists?.playerName).toBe('TestPlayer');
    });

    it('should handle delete of non-existent game gracefully', async () => {
      await expect(
        prisma.gameResult.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('GameResult Match Relationship', () => {
    it('should verify match relation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      const found = await prisma.gameResult.findUnique({
        where: { id: game.id },
        include: { match: true },
      });

      expect(found?.match).not.toBeNull();
      expect(found?.match.identifier).toBe('A1');
    });

    it('should delete game when match deleted (cascade)', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });
      await createGameResult(prisma, match.id, player.id, { gameNumber: 2 });

      // Verify games exist
      const gamesBefore = await prisma.gameResult.findMany({
        where: { matchId: match.id },
      });
      expect(gamesBefore.length).toBe(2);

      // Delete match (cascades to games)
      await prisma.match.delete({
        where: { id: match.id },
      });

      // Verify games are deleted
      const gamesAfter = await prisma.gameResult.findMany({
        where: { matchId: match.id },
      });
      expect(gamesAfter.length).toBe(0);
    });
  });

  describe('GameResult MatchPlayer Relationship', () => {
    it('should verify matchPlayer relation', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      const found = await prisma.gameResult.findUnique({
        where: { id: game.id },
        include: { matchPlayer: true },
      });

      expect(found?.matchPlayer).not.toBeNull();
      expect(found?.matchPlayer?.playerName).toBe('TestPlayer');
    });

    it('should delete game when player deleted (cascade)', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, { gameNumber: 1 });

      // Verify game exists
      const gameExists = await prisma.gameResult.findUnique({
        where: { id: game.id },
      });
      expect(gameExists).not.toBeNull();

      // Delete player (cascades to games)
      await prisma.matchPlayer.delete({
        where: { id: player.id },
      });

      // Verify game is deleted
      const gameDeleted = await prisma.gameResult.findUnique({
        where: { id: game.id },
      });
      expect(gameDeleted).toBeNull();
    });

    it('should query game with match and player', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id, { identifier: 'A1' });
      const user = await createUser(prisma);

      const player = await createMatchPlayer(prisma, match.id, {
        playerName: 'TestPlayer',
        userId: user.id,
      });

      const game = await createGameResult(prisma, match.id, player.id, {
        gameNumber: 1,
        winnerId: player.id,
      });

      const fullGame = await prisma.gameResult.findUnique({
        where: { id: game.id },
        include: {
          match: true,
          matchPlayer: true,
        },
      });

      expect(fullGame?.match).not.toBeNull();
      expect(fullGame?.matchPlayer).not.toBeNull();
      expect(fullGame?.match.identifier).toBe('A1');
      expect(fullGame?.matchPlayer.playerName).toBe('TestPlayer');
    });
  });
});
