/**
 * Integration tests for AuditLog model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, delete, and cascade operations.
 * Note: Audit logs are immutable append-only, so no update tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, AuditAction, AuditSource } from '@prisma/client';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';
import { createUser, createAuditLog, createTournament, createEvent, createMatch } from '../utils/seeders';
import { getTestDatabaseUrl } from '../utils/test-env';
import type { AuditLog } from '@prisma/client';

describe('AuditLog Model Integration Tests', () => {
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

  describe('AuditLog Create Operations', () => {
    it('should create audit log linked to user', async () => {
      const user = await createUser(prisma);

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 'tournament-123',
      });

      expect(auditLog.id).toBeDefined();
      expect(auditLog.userId).toBe(user.id);
      expect(auditLog.action).toBe(AuditAction.TOURNAMENT_CREATED);
      expect(auditLog.entityType).toBe('Tournament');
      expect(auditLog.entityId).toBe('tournament-123');
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });

    it('should create audit log using factory helper', async () => {
      const user = await createUser(prisma);

      const auditLog = await createAuditLog(prisma, user.id);

      expect(auditLog.id).toBeDefined();
      expect(auditLog.action).toBe(AuditAction.TOURNAMENT_CREATED);
      expect(auditLog.entityType).toBe('Tournament');
    });

    it('should create audit log with all fields', async () => {
      const user = await createUser(prisma);

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.MATCH_SCORE_OVERRIDE,
        entityType: 'Match',
        entityId: 'match-456',
        reason: 'Player reported incorrect score',
        source: AuditSource.WEB,
        before: { score: '2-1' },
        after: { score: '2-0' },
      });

      expect(auditLog.action).toBe(AuditAction.MATCH_SCORE_OVERRIDE);
      expect(auditLog.entityType).toBe('Match');
      expect(auditLog.entityId).toBe('match-456');
      expect(auditLog.reason).toBe('Player reported incorrect score');
      expect(auditLog.source).toBe(AuditSource.WEB);
      expect(auditLog.before).toEqual({ score: '2-1' });
      expect(auditLog.after).toEqual({ score: '2-0' });
    });

    it('should create audit log with different action types', async () => {
      const user = await createUser(prisma);

      const actions = [
        AuditAction.TOURNAMENT_CREATED,
        AuditAction.TOURNAMENT_UPDATED,
        AuditAction.MATCH_SCORE_OVERRIDE,
        AuditAction.PLAYER_DQ,
        AuditAction.REGISTRATION_APPROVED,
        AuditAction.DISPUTE_OPENED,
        AuditAction.CONFIG_UPDATED,
        AuditAction.ADMIN_ADDED,
      ];

      for (const action of actions) {
        const auditLog = await createAuditLog(prisma, user.id, {
          action,
          entityType: 'Test',
          entityId: `test-${action}`,
        });
        expect(auditLog.action).toBe(action);
      }
    });

    it('should create audit log with API source', async () => {
      const user = await createUser(prisma);

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.REGISTRATION_MANUAL_ADD,
        entityType: 'Registration',
        entityId: 'reg-789',
        source: AuditSource.API,
      });

      expect(auditLog.source).toBe(AuditSource.API);
    });
  });

  describe('AuditLog Read Operations', () => {
    it('should find logs by entity type and id', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: tournament.id,
      });

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_UPDATED,
        entityType: 'Tournament',
        entityId: tournament.id,
      });

      const found = await prisma.auditLog.findMany({
        where: {
          entityType: 'Tournament',
          entityId: tournament.id,
        },
      });

      expect(found.length).toBe(2);
      expect(found[0]?.entityId).toBe(tournament.id);
      expect(found[1]?.entityId).toBe(tournament.id);
    });

    it('should find logs by user', async () => {
      const user1 = await createUser(prisma);
      const user2 = await createUser(prisma);

      await createAuditLog(prisma, user1.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't1',
      });

      await createAuditLog(prisma, user2.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't2',
      });

      const user1Logs = await prisma.auditLog.findMany({
        where: { userId: user1.id },
      });

      expect(user1Logs.length).toBe(1);
      expect(user1Logs[0]?.userId).toBe(user1.id);
    });

    it('should find audit log by id', async () => {
      const user = await createUser(prisma);

      const created = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't-find',
      });

      const found = await prisma.auditLog.findUnique({
        where: { id: created.id },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should find logs by action type', async () => {
      const user = await createUser(prisma);

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't1',
      });

      await createAuditLog(prisma, user.id, {
        action: AuditAction.MATCH_SCORE_OVERRIDE,
        entityType: 'Match',
        entityId: 'm1',
      });

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't2',
      });

      const tournamentCreatedLogs = await prisma.auditLog.findMany({
        where: { action: AuditAction.TOURNAMENT_CREATED },
      });

      expect(tournamentCreatedLogs.length).toBe(2);
    });

    it('should filter logs by source', async () => {
      const user = await createUser(prisma);

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't1',
        source: AuditSource.DISCORD,
      });

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't2',
        source: AuditSource.WEB,
      });

      const discordLogs = await prisma.auditLog.findMany({
        where: { source: AuditSource.DISCORD },
      });

      expect(discordLogs.length).toBe(1);
    });

    it('should order logs by createdAt descending', async () => {
      const user = await createUser(prisma);

      const log1 = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't1',
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const log2 = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_UPDATED,
        entityType: 'Tournament',
        entityId: 't1',
      });

      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
      });

      expect(logs[0]?.id).toBe(log2.id);
      expect(logs[1]?.id).toBe(log1.id);
    });

    it('should include user relation', async () => {
      const user = await createUser(prisma, { discordUsername: 'auditUser' });

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't-include',
      });

      const found = await prisma.auditLog.findUnique({
        where: { id: auditLog.id },
        include: { user: true },
      });

      expect(found).not.toBeNull();
      expect(found?.user.id).toBe(user.id);
      expect(found?.user.discordUsername).toBe('auditUser');
    });
  });

  describe('AuditLog Delete Operations', () => {
    it('should delete audit log', async () => {
      const user = await createUser(prisma);

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't-delete',
      });

      await prisma.auditLog.delete({
        where: { id: auditLog.id },
      });

      const found = await prisma.auditLog.findUnique({
        where: { id: auditLog.id },
      });

      expect(found).toBeNull();
    });

    it('should delete audit log without affecting user', async () => {
      const user = await createUser(prisma);
      const userId = user.id;

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't1',
      });

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_UPDATED,
        entityType: 'Tournament',
        entityId: 't1',
      });

      await prisma.auditLog.deleteMany({
        where: { userId },
      });

      const userStillExists = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(userStillExists).not.toBeNull();

      const logsRemaining = await prisma.auditLog.findMany({
        where: { userId },
      });

      expect(logsRemaining.length).toBe(0);
    });

    it('should cascade delete audit logs when user is deleted', async () => {
      const user = await createUser(prisma);
      const userId = user.id;

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: 't-cascade',
      });

      await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_UPDATED,
        entityType: 'Tournament',
        entityId: 't-cascade',
      });

      await prisma.user.delete({
        where: { id: userId },
      });

      const logs = await prisma.auditLog.findMany({
        where: { userId },
      });

      expect(logs.length).toBe(0);
    });
  });

  describe('AuditLog Relationship Tests', () => {
    it('should verify user relation', async () => {
      const user = await createUser(prisma, { discordUsername: 'relationUser' });

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.PLAYER_CHECK_IN,
        entityType: 'Match',
        entityId: 'match-rel',
      });

      const found = await prisma.auditLog.findUnique({
        where: { id: auditLog.id },
        include: { user: true },
      });

      expect(found?.user.id).toBe(user.id);
      expect(found?.user.discordUsername).toBe('relationUser');
    });

    it('should store before/after JSON correctly', async () => {
      const user = await createUser(prisma);

      const beforeState = {
        name: 'Old Tournament Name',
        state: 'REGISTRATION_OPEN',
      };

      const afterState = {
        name: 'New Tournament Name',
        state: 'IN_PROGRESS',
      };

      const auditLog = await createAuditLog(prisma, user.id, {
        action: AuditAction.TOURNAMENT_UPDATED,
        entityType: 'Tournament',
        entityId: 't-json',
        before: beforeState,
        after: afterState,
      });

      const found = await prisma.auditLog.findUnique({
        where: { id: auditLog.id },
      });

      expect(found?.before).toEqual(beforeState);
      expect(found?.after).toEqual(afterState);
    });
  });
});
