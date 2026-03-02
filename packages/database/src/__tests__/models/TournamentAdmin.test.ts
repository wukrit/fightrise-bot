/**
 * Integration tests for TournamentAdmin model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete, and cascade operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, AdminRole } from '@prisma/client';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../setup';
import { createUser, createTournament, createTournamentAdmin } from '../utils/seeders';
import { getTestDatabaseUrl } from '../utils/test-env';
import type { TournamentAdmin } from '@prisma/client';

describe('TournamentAdmin Model Integration Tests', () => {
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

  describe('TournamentAdmin Create Operations', () => {
    it('should create admin with required fields', async () => {
      const user = await createUser(prisma, { discordId: 'discord-admin-1' });
      const tournament = await createTournament(prisma);

      const admin = await prisma.tournamentAdmin.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
        },
      });

      expect(admin.id).toBeDefined();
      expect(admin.userId).toBe(user.id);
      expect(admin.tournamentId).toBe(tournament.id);
      expect(admin.role).toBe(AdminRole.MODERATOR);
      expect(admin.createdAt).toBeInstanceOf(Date);
      expect(admin.updatedAt).toBeInstanceOf(Date);
    });

    it('should create admin with specific role', async () => {
      const user = await createUser(prisma, { discordId: 'discord-owner' });
      const tournament = await createTournament(prisma);

      const admin = await prisma.tournamentAdmin.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
          role: AdminRole.OWNER,
        },
      });

      expect(admin.role).toBe(AdminRole.OWNER);
    });

    it('should create admin with ADMIN role', async () => {
      const user = await createUser(prisma, { discordId: 'discord-admin-role' });
      const tournament = await createTournament(prisma);

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id, {
        role: AdminRole.ADMIN,
      });

      expect(admin.role).toBe(AdminRole.ADMIN);
    });

    it('should create admin using factory helper', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id, {
        role: AdminRole.OWNER,
      });

      expect(admin.id).toBeDefined();
      expect(admin.userId).toBe(user.id);
      expect(admin.tournamentId).toBe(tournament.id);
      expect(admin.role).toBe(AdminRole.OWNER);
    });

    it('should create multiple admins for same tournament', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-mod-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-mod-2' });
      const user3 = await createUser(prisma, { discordId: 'discord-admin-3' });

      const admin1 = await createTournamentAdmin(prisma, user1.id, tournament.id, { role: AdminRole.MODERATOR });
      const admin2 = await createTournamentAdmin(prisma, user2.id, tournament.id, { role: AdminRole.MODERATOR });
      const admin3 = await createTournamentAdmin(prisma, user3.id, tournament.id, { role: AdminRole.ADMIN });

      expect(admin1.tournamentId).toBe(tournament.id);
      expect(admin2.tournamentId).toBe(tournament.id);
      expect(admin3.tournamentId).toBe(tournament.id);
    });
  });

  describe('TournamentAdmin Read Operations', () => {
    it('should find admins by user', async () => {
      const user = await createUser(prisma, { discordId: 'discord-findbyuser' });
      const tournament1 = await createTournament(prisma, { name: 'Tournament A' });
      const tournament2 = await createTournament(prisma, { name: 'Tournament B' });

      await createTournamentAdmin(prisma, user.id, tournament1.id);
      await createTournamentAdmin(prisma, user.id, tournament2.id);

      const userAdmins = await prisma.tournamentAdmin.findMany({
        where: { userId: user.id },
      });

      expect(userAdmins.length).toBe(2);
    });

    it('should find admins by tournament', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-tourney-admin-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-tourney-admin-2' });

      await createTournamentAdmin(prisma, user1.id, tournament.id);
      await createTournamentAdmin(prisma, user2.id, tournament.id);

      const tournamentAdmins = await prisma.tournamentAdmin.findMany({
        where: { tournamentId: tournament.id },
      });

      expect(tournamentAdmins.length).toBe(2);
    });

    it('should find admins by role', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-owner-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-admin-2' });
      const user3 = await createUser(prisma, { discordId: 'discord-mod-3' });

      await createTournamentAdmin(prisma, user1.id, tournament.id, { role: AdminRole.OWNER });
      await createTournamentAdmin(prisma, user2.id, tournament.id, { role: AdminRole.ADMIN });
      await createTournamentAdmin(prisma, user3.id, tournament.id, { role: AdminRole.MODERATOR });

      const owners = await prisma.tournamentAdmin.findMany({
        where: { role: AdminRole.OWNER },
      });
      expect(owners.length).toBe(1);

      const admins = await prisma.tournamentAdmin.findMany({
        where: { role: AdminRole.ADMIN },
      });
      expect(admins.length).toBe(1);

      const moderators = await prisma.tournamentAdmin.findMany({
        where: { role: AdminRole.MODERATOR },
      });
      expect(moderators.length).toBe(1);
    });

    it('should find admin by unique constraint', async () => {
      const user = await createUser(prisma, { discordId: 'discord-unique' });
      const tournament = await createTournament(prisma);

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      const found = await prisma.tournamentAdmin.findUnique({
        where: {
          userId_tournamentId: {
            userId: user.id,
            tournamentId: tournament.id,
          },
        },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(admin.id);
    });

    it('should include user relation when querying', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-rel',
        displayName: 'Related User',
      });
      const tournament = await createTournament(prisma);

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      const adminWithUser = await prisma.tournamentAdmin.findUnique({
        where: { id: admin.id },
        include: { user: true },
      });

      expect(adminWithUser?.user).not.toBeNull();
      expect(adminWithUser?.user.id).toBe(user.id);
      expect(adminWithUser?.user.displayName).toBe('Related User');
    });

    it('should include tournament relation when querying', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma, {
        name: 'Related Tournament',
      });

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      const adminWithTournament = await prisma.tournamentAdmin.findUnique({
        where: { id: admin.id },
        include: { tournament: true },
      });

      expect(adminWithTournament?.tournament).not.toBeNull();
      expect(adminWithTournament?.tournament.id).toBe(tournament.id);
      expect(adminWithTournament?.tournament.name).toBe('Related Tournament');
    });
  });

  describe('TournamentAdmin Update Operations', () => {
    it('should update admin role', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const admin = await createTournamentAdmin(prisma, user.id, tournament.id, {
        role: AdminRole.MODERATOR,
      });

      const updated = await prisma.tournamentAdmin.update({
        where: { id: admin.id },
        data: { role: AdminRole.ADMIN },
      });

      expect(updated.role).toBe(AdminRole.ADMIN);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        admin.updatedAt.getTime()
      );
    });

    it('should update role through hierarchy', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const admin = await createTournamentAdmin(prisma, user.id, tournament.id, {
        role: AdminRole.MODERATOR,
      });

      // Moderator to Admin
      let updated = await prisma.tournamentAdmin.update({
        where: { id: admin.id },
        data: { role: AdminRole.ADMIN },
      });
      expect(updated.role).toBe(AdminRole.ADMIN);

      // Admin to Owner
      updated = await prisma.tournamentAdmin.update({
        where: { id: admin.id },
        data: { role: AdminRole.OWNER },
      });
      expect(updated.role).toBe(AdminRole.OWNER);

      // Owner to Moderator (demotion)
      updated = await prisma.tournamentAdmin.update({
        where: { id: admin.id },
        data: { role: AdminRole.MODERATOR },
      });
      expect(updated.role).toBe(AdminRole.MODERATOR);
    });

    it('should update both userId and tournamentId', async () => {
      const user1 = await createUser(prisma, { discordId: 'discord-update-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-update-2' });
      const tournament1 = await createTournament(prisma, { name: 'Tournament 1' });
      const tournament2 = await createTournament(prisma, { name: 'Tournament 2' });

      const admin = await createTournamentAdmin(prisma, user1.id, tournament1.id);

      const updated = await prisma.tournamentAdmin.update({
        where: { id: admin.id },
        data: {
          userId: user2.id,
          tournamentId: tournament2.id,
        },
      });

      expect(updated.userId).toBe(user2.id);
      expect(updated.tournamentId).toBe(tournament2.id);
    });
  });

  describe('TournamentAdmin Delete Operations', () => {
    it('should delete admin', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);
      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      await prisma.tournamentAdmin.delete({
        where: { id: admin.id },
      });

      const found = await prisma.tournamentAdmin.findUnique({
        where: { id: admin.id },
      });

      expect(found).toBeNull();
    });

    it('should delete admin without affecting user', async () => {
      const user = await createUser(prisma, { discordId: 'discord-preserve' });
      const tournament = await createTournament(prisma);
      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      await prisma.tournamentAdmin.delete({
        where: { id: admin.id },
      });

      const userStillExists = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(userStillExists).not.toBeNull();
      expect(userStillExists?.discordId).toBe('discord-preserve');
    });

    it('should delete admin without affecting tournament', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma, {
        startggId: 'startgg-preserve',
        name: 'Preserve Tournament',
      });
      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      await prisma.tournamentAdmin.delete({
        where: { id: admin.id },
      });

      const tournamentStillExists = await prisma.tournament.findUnique({
        where: { id: tournament.id },
      });

      expect(tournamentStillExists).not.toBeNull();
      expect(tournamentStillExists?.name).toBe('Preserve Tournament');
    });

    it('should cascade delete admins when user deleted', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });

      const user = await testPrisma.user.create({
        data: { discordId: 'discord-cascade-user', displayName: 'Cascade User' },
      });
      const tournament1 = await testPrisma.tournament.create({
        data: { startggId: 'startgg-cascade-1', startggSlug: 'cascade-1', name: 'Cascade Tournament 1' },
      });
      const tournament2 = await testPrisma.tournament.create({
        data: { startggId: 'startgg-cascade-2', startggSlug: 'cascade-2', name: 'Cascade Tournament 2' },
      });

      // Create two admins for the same user across different tournaments
      await testPrisma.tournamentAdmin.create({
        data: { userId: user.id, tournamentId: tournament1.id },
      });
      await testPrisma.tournamentAdmin.create({
        data: { userId: user.id, tournamentId: tournament2.id },
      });

      // Verify admins exist
      const adminsBefore = await testPrisma.tournamentAdmin.findMany({
        where: { userId: user.id },
      });
      expect(adminsBefore.length).toBe(2);

      // Delete user (cascades to admins)
      await testPrisma.user.delete({ where: { id: user.id } });

      // Verify admins are deleted
      const adminsAfter = await testPrisma.tournamentAdmin.findMany({
        where: { userId: user.id },
      });
      expect(adminsAfter.length).toBe(0);

      await testPrisma.$disconnect();
    });

    it('should cascade delete admins when tournament deleted', async () => {
      const user1 = await createUser(prisma, { discordId: 'discord-cascade-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-cascade-2' });
      const tournament = await createTournament(prisma);

      // Create two admins for the same tournament with different users
      await createTournamentAdmin(prisma, user1.id, tournament.id);
      await createTournamentAdmin(prisma, user2.id, tournament.id);

      // Verify admins exist
      const adminsBefore = await prisma.tournamentAdmin.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(adminsBefore.length).toBe(2);

      // Delete tournament (cascades to admins)
      await prisma.tournament.delete({
        where: { id: tournament.id },
      });

      // Verify admins are deleted
      const adminsAfter = await prisma.tournamentAdmin.findMany({
        where: { tournamentId: tournament.id },
      });
      expect(adminsAfter.length).toBe(0);
    });

    it('should handle delete of non-existent admin gracefully', async () => {
      await expect(
        prisma.tournamentAdmin.delete({
          where: { id: 'non-existent-id' },
        })
      ).rejects.toThrow();
    });
  });

  describe('TournamentAdmin Relationships', () => {
    it('should verify user relation', async () => {
      const user = await createUser(prisma, {
        discordId: 'discord-verify',
        displayName: 'Verify User',
      });
      const tournament = await createTournament(prisma);

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      const found = await prisma.tournamentAdmin.findUnique({
        where: { id: admin.id },
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

      const admin = await createTournamentAdmin(prisma, user.id, tournament.id);

      const found = await prisma.tournamentAdmin.findUnique({
        where: { id: admin.id },
        include: { tournament: true },
      });

      expect(found?.tournament).not.toBeNull();
      expect(found?.tournament.id).toBe(tournament.id);
      expect(found?.tournament.name).toBe('Verify Tournament');
    });

    it('should enforce unique constraint on userId + tournamentId', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma);

      // Create first admin
      await createTournamentAdmin(prisma, user.id, tournament.id);

      // Attempt to create duplicate should fail
      await expect(
        createTournamentAdmin(prisma, user.id, tournament.id)
      ).rejects.toThrow();
    });

    it('should allow same user as admin of different tournaments', async () => {
      const user = await createUser(prisma);
      const tournament1 = await createTournament(prisma, { name: 'Tournament 1' });
      const tournament2 = await createTournament(prisma, { name: 'Tournament 2' });

      const admin1 = await createTournamentAdmin(prisma, user.id, tournament1.id);
      const admin2 = await createTournamentAdmin(prisma, user.id, tournament2.id);

      expect(admin1.id).not.toBe(admin2.id);
      expect(admin1.tournamentId).toBe(tournament1.id);
      expect(admin2.tournamentId).toBe(tournament2.id);
    });

    it('should allow different users as admins of same tournament', async () => {
      const tournament = await createTournament(prisma);
      const user1 = await createUser(prisma, { discordId: 'discord-multi-1' });
      const user2 = await createUser(prisma, { discordId: 'discord-multi-2' });

      const admin1 = await createTournamentAdmin(prisma, user1.id, tournament.id);
      const admin2 = await createTournamentAdmin(prisma, user2.id, tournament.id);

      expect(admin1.id).not.toBe(admin2.id);
      expect(admin1.userId).toBe(user1.id);
      expect(admin2.userId).toBe(user2.id);
    });
  });
});
