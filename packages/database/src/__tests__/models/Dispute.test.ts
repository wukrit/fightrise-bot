/**
 * Integration tests for Dispute model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and cascade operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, DisputeStatus } from '@prisma/client';
import { createUser, createTournament, createEvent, createMatch, createDispute } from '../utils/seeders';
import { createTestPrisma, clearDatabase } from '../utils/test-setup';

import type { Dispute } from '@prisma/client';

describe('Dispute Model Integration Tests', () => {
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

  describe('Dispute Create Operations', () => {
    it('should create dispute linked to match and initiator user', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id, {
        reason: 'Player was not present',
        status: DisputeStatus.OPEN,
      });

      expect(dispute.id).toBeDefined();
      expect(dispute.matchId).toBe(match.id);
      expect(dispute.initiatorId).toBe(user.id);
      expect(dispute.reason).toBe('Player was not present');
      expect(dispute.status).toBe(DisputeStatus.OPEN);
      expect(dispute.createdAt).toBeInstanceOf(Date);
      expect(dispute.updatedAt).toBeInstanceOf(Date);
    });

    it('should create dispute using factory helper', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      expect(dispute.id).toBeDefined();
      expect(dispute.status).toBe(DisputeStatus.OPEN);
    });

    it('should create resolved dispute with resolver', async () => {
      const initiator = await createUser(prisma);
      const resolver = await createUser(prisma, { displayName: 'Resolver User' });
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, initiator.id, {
        status: DisputeStatus.RESOLVED,
        resolvedById: resolver.id,
        resolution: 'Both players agree on the result',
        resolvedAt: new Date(),
      });

      expect(dispute.status).toBe(DisputeStatus.RESOLVED);
      expect(dispute.resolvedById).toBe(resolver.id);
      expect(dispute.resolution).toBe('Both players agree on the result');
      expect(dispute.resolvedAt).toBeInstanceOf(Date);
    });

    it('should create cancelled dispute', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id, {
        status: DisputeStatus.CANCELLED,
      });

      expect(dispute.status).toBe(DisputeStatus.CANCELLED);
    });

    it('should create multiple disputes for same match', async () => {
      const user1 = await createUser(prisma);
      const user2 = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute1 = await createDispute(prisma, match.id, user1.id, { reason: 'First dispute' });
      const dispute2 = await createDispute(prisma, match.id, user2.id, { reason: 'Second dispute' });

      expect(dispute1.id).not.toBe(dispute2.id);
      expect(dispute1.matchId).toBe(match.id);
      expect(dispute2.matchId).toBe(match.id);
    });
  });

  describe('Dispute Read Operations', () => {
    it('should find disputes by match', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      const found = await prisma.dispute.findMany({
        where: { matchId: match.id },
      });

      expect(found.length).toBe(1);
      expect(found[0]?.id).toBe(dispute.id);
    });

    it('should find disputes by initiator', async () => {
      const user = await createUser(prisma);
      const otherUser = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      await createDispute(prisma, match.id, user.id);
      await createDispute(prisma, match.id, otherUser.id);

      const found = await prisma.dispute.findMany({
        where: { initiatorId: user.id },
      });

      expect(found.length).toBe(1);
      expect(found[0]?.initiatorId).toBe(user.id);
    });

    it('should find dispute by id', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const created = await createDispute(prisma, match.id, user.id);

      const found = await prisma.dispute.findUnique({
        where: { id: created.id },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should filter disputes by status', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      await createDispute(prisma, match.id, user.id, { status: DisputeStatus.OPEN });
      await createDispute(prisma, match.id, user.id, { status: DisputeStatus.RESOLVED });

      const openDisputes = await prisma.dispute.findMany({
        where: { status: DisputeStatus.OPEN },
      });

      const resolvedDisputes = await prisma.dispute.findMany({
        where: { status: DisputeStatus.RESOLVED },
      });

      expect(openDisputes.length).toBe(1);
      expect(resolvedDisputes.length).toBe(1);
    });

    it('should find disputes with includes', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      const found = await prisma.dispute.findUnique({
        where: { id: dispute.id },
        include: {
          match: true,
          initiator: true,
        },
      });

      expect(found).not.toBeNull();
      expect(found?.match.id).toBe(match.id);
      expect(found?.initiator.id).toBe(user.id);
    });
  });

  describe('Dispute Update Operations', () => {
    it('should update dispute status', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      const updated = await prisma.dispute.update({
        where: { id: dispute.id },
        data: { status: DisputeStatus.RESOLVED },
      });

      expect(updated.status).toBe(DisputeStatus.RESOLVED);
    });

    it('should resolve dispute with resolvedBy', async () => {
      const initiator = await createUser(prisma);
      const resolver = await createUser(prisma, { displayName: 'Admin Resolver' });
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, initiator.id);

      const updated = await prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          status: DisputeStatus.RESOLVED,
          resolvedById: resolver.id,
          resolution: 'Resolved in favor of the player who was present',
          resolvedAt: new Date(),
        },
      });

      expect(updated.status).toBe(DisputeStatus.RESOLVED);
      expect(updated.resolvedById).toBe(resolver.id);
      expect(updated.resolution).toBe('Resolved in favor of the player who was present');
      expect(updated.resolvedAt).toBeInstanceOf(Date);
    });

    it('should update dispute reason', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id, {
        reason: 'Original reason',
      });

      const updated = await prisma.dispute.update({
        where: { id: dispute.id },
        data: { reason: 'Updated reason with more details' },
      });

      expect(updated.reason).toBe('Updated reason with more details');
    });

    it('should cancel dispute', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      const updated = await prisma.dispute.update({
        where: { id: dispute.id },
        data: { status: DisputeStatus.CANCELLED },
      });

      expect(updated.status).toBe(DisputeStatus.CANCELLED);
    });
  });

  describe('Dispute Delete Operations', () => {
    it('should delete dispute without affecting match', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);
      const matchId = match.id;

      await prisma.dispute.delete({
        where: { id: dispute.id },
      });

      const found = await prisma.dispute.findUnique({
        where: { id: dispute.id },
      });

      const matchStillExists = await prisma.match.findUnique({
        where: { id: matchId },
      });

      expect(found).toBeNull();
      expect(matchStillExists).not.toBeNull();
    });

    it('should delete dispute and not affect initiator user', async () => {
      const user = await createUser(prisma);
      const userId = user.id;
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      await prisma.dispute.delete({
        where: { id: dispute.id },
      });

      const userStillExists = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(userStillExists).not.toBeNull();
    });

    it('should cascade delete disputes when match is deleted', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      await createDispute(prisma, match.id, user.id);
      await createDispute(prisma, match.id, user.id);

      await prisma.match.delete({
        where: { id: match.id },
      });

      const disputes = await prisma.dispute.findMany({
        where: { matchId: match.id },
      });

      expect(disputes.length).toBe(0);
    });
  });

  describe('Dispute Relationship Tests', () => {
    it('should verify match relation', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      const found = await prisma.dispute.findUnique({
        where: { id: dispute.id },
        include: { match: true },
      });

      expect(found?.match.id).toBe(match.id);
      expect(found?.match.startggSetId).toBe(match.startggSetId);
    });

    it('should verify initiator relation', async () => {
      const user = await createUser(prisma, { discordUsername: 'testInitiator' });
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, user.id);

      const found = await prisma.dispute.findUnique({
        where: { id: dispute.id },
        include: { initiator: true },
      });

      expect(found?.initiator.id).toBe(user.id);
      expect(found?.initiator.discordUsername).toBe('testInitiator');
    });

    it('should verify resolver relation after resolution', async () => {
      const initiator = await createUser(prisma);
      const resolver = await createUser(prisma, { displayName: 'Admin' });
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, initiator.id, {
        status: DisputeStatus.RESOLVED,
        resolvedById: resolver.id,
        resolution: 'Resolved',
      });

      const found = await prisma.dispute.findUnique({
        where: { id: dispute.id },
        include: { resolvedBy: true },
      });

      expect(found?.resolvedBy?.id).toBe(resolver.id);
    });

    it('should set resolvedById to null when resolver is deleted', async () => {
      const initiator = await createUser(prisma);
      const resolver = await createUser(prisma, { displayName: 'ToDelete' });
      const resolverId = resolver.id;
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);
      const match = await createMatch(prisma, event.id);

      const dispute = await createDispute(prisma, match.id, initiator.id, {
        status: DisputeStatus.RESOLVED,
        resolvedById: resolverId,
      });

      await prisma.user.delete({
        where: { id: resolverId },
      });

      const updated = await prisma.dispute.findUnique({
        where: { id: dispute.id },
      });

      expect(updated?.resolvedById).toBeNull();
    });
  });
});
