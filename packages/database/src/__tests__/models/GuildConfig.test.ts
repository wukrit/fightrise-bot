/**
 * Integration tests for GuildConfig model CRUD operations.
 *
 * Uses Testcontainers for isolated PostgreSQL database.
 * Tests create, read, update, delete operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createGuildConfig } from '../utils/seeders';
import { createTestPrisma, clearDatabase } from '../utils/test-setup';

import type { GuildConfig } from '@prisma/client';

describe('GuildConfig Model Integration Tests', () => {
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

  describe('GuildConfig Create Operations', () => {
    it('should create guild config with required fields', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-12345',
      });

      expect(guildConfig.id).toBeDefined();
      expect(guildConfig.discordGuildId).toBe('guild-12345');
      expect(guildConfig.createdAt).toBeInstanceOf(Date);
      expect(guildConfig.updatedAt).toBeInstanceOf(Date);
    });

    it('should create guild config with all optional fields', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-12345',
        announcementChannelId: 'announce-channel-123',
        matchChannelId: 'match-channel-456',
        prefix: '/',
        locale: 'es',
        timezone: 'America/New_York',
      });

      expect(guildConfig.announcementChannelId).toBe('announce-channel-123');
      expect(guildConfig.matchChannelId).toBe('match-channel-456');
      expect(guildConfig.prefix).toBe('/');
      expect(guildConfig.locale).toBe('es');
      expect(guildConfig.timezone).toBe('America/New_York');
    });

    it('should create guild config using factory helper', async () => {
      const guildConfig = await createGuildConfig(prisma);

      expect(guildConfig.id).toBeDefined();
      expect(guildConfig.discordGuildId).toBeDefined();
      expect(guildConfig.prefix).toBe('!');
      expect(guildConfig.locale).toBe('en');
      expect(guildConfig.timezone).toBe('UTC');
    });

    it('should create guild config with default values', async () => {
      const guildConfig = await prisma.guildConfig.create({
        data: {
          discordGuildId: 'guild-defaults',
        },
      });

      expect(guildConfig.prefix).toBe('!');
      expect(guildConfig.locale).toBe('en');
      expect(guildConfig.timezone).toBe('UTC');
      expect(guildConfig.announcementChannelId).toBeNull();
      expect(guildConfig.matchChannelId).toBeNull();
    });

    it('should enforce unique discordGuildId', async () => {
      const discordGuildId = 'unique-guild-123';

      await createGuildConfig(prisma, { discordGuildId });

      await expect(
        prisma.guildConfig.create({
          data: {
            discordGuildId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('GuildConfig Read Operations', () => {
    it('should find guild config by discordGuildId', async () => {
      const created = await createGuildConfig(prisma, {
        discordGuildId: 'find-me-guild',
      });

      const found = await prisma.guildConfig.findUnique({
        where: { discordGuildId: 'find-me-guild' },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should find guild config by id', async () => {
      const created = await createGuildConfig(prisma);

      const found = await prisma.guildConfig.findUnique({
        where: { id: created.id },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent guild', async () => {
      const found = await prisma.guildConfig.findUnique({
        where: { discordGuildId: 'non-existent-guild' },
      });

      expect(found).toBeNull();
    });

    it('should find all guild configs', async () => {
      await createGuildConfig(prisma, { discordGuildId: 'guild-1' });
      await createGuildConfig(prisma, { discordGuildId: 'guild-2' });
      await createGuildConfig(prisma, { discordGuildId: 'guild-3' });

      const all = await prisma.guildConfig.findMany();

      expect(all.length).toBe(3);
    });
  });

  describe('GuildConfig Update Operations', () => {
    it('should update announcement channel', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-1',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: { announcementChannelId: 'new-announce-channel' },
      });

      expect(updated.announcementChannelId).toBe('new-announce-channel');
    });

    it('should update match channel', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-2',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: { matchChannelId: 'new-match-channel' },
      });

      expect(updated.matchChannelId).toBe('new-match-channel');
    });

    it('should update prefix', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-3',
        prefix: '!',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: { prefix: '?' },
      });

      expect(updated.prefix).toBe('?');
    });

    it('should update locale', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-4',
        locale: 'en',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: { locale: 'fr' },
      });

      expect(updated.locale).toBe('fr');
    });

    it('should update timezone', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-5',
        timezone: 'UTC',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: { timezone: 'America/Los_Angeles' },
      });

      expect(updated.timezone).toBe('America/Los_Angeles');
    });

    it('should update multiple fields at once', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-multi',
        prefix: '!',
        locale: 'en',
        timezone: 'UTC',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: {
          prefix: '/',
          locale: 'de',
          timezone: 'Europe/Berlin',
          announcementChannelId: 'new-announce',
          matchChannelId: 'new-match',
        },
      });

      expect(updated.prefix).toBe('/');
      expect(updated.locale).toBe('de');
      expect(updated.timezone).toBe('Europe/Berlin');
      expect(updated.announcementChannelId).toBe('new-announce');
      expect(updated.matchChannelId).toBe('new-match');
    });

    it('should clear optional channel fields by setting to null', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-update-null',
        announcementChannelId: 'has-value',
        matchChannelId: 'has-value',
      });

      const updated = await prisma.guildConfig.update({
        where: { id: guildConfig.id },
        data: {
          announcementChannelId: null,
          matchChannelId: null,
        },
      });

      expect(updated.announcementChannelId).toBeNull();
      expect(updated.matchChannelId).toBeNull();
    });
  });

  describe('GuildConfig Delete Operations', () => {
    it('should delete guild config', async () => {
      const guildConfig = await createGuildConfig(prisma, {
        discordGuildId: 'guild-delete-1',
      });

      await prisma.guildConfig.delete({
        where: { id: guildConfig.id },
      });

      const found = await prisma.guildConfig.findUnique({
        where: { id: guildConfig.id },
      });

      expect(found).toBeNull();
    });

    it('should delete guild config by discordGuildId', async () => {
      const discordGuildId = 'guild-delete-2';
      await createGuildConfig(prisma, { discordGuildId });

      await prisma.guildConfig.delete({
        where: { discordGuildId },
      });

      const found = await prisma.guildConfig.findUnique({
        where: { discordGuildId },
      });

      expect(found).toBeNull();
    });

    it('should allow recreating deleted guild config', async () => {
      const discordGuildId = 'guild-delete-recreate';
      await createGuildConfig(prisma, { discordGuildId });

      await prisma.guildConfig.delete({
        where: { discordGuildId },
      });

      const recreated = await createGuildConfig(prisma, { discordGuildId });

      expect(recreated.discordGuildId).toBe(discordGuildId);
    });
  });
});
