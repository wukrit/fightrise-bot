import { describe, it, expect, afterAll } from 'vitest';
import { prisma, PrismaClient } from './index.js';

describe('@fightrise/database', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('exports a PrismaClient instance', () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it('can connect to the database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  it('can perform basic CRUD operations', async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        discordId: 'test-discord-id-' + Date.now(),
        discordUsername: 'testuser',
        displayName: 'Test User',
      },
    });
    expect(user.id).toBeDefined();
    expect(user.discordUsername).toBe('testuser');

    // Read the user
    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(foundUser).not.toBeNull();
    expect(foundUser?.displayName).toBe('Test User');

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: 'Updated User' },
    });
    expect(updatedUser.displayName).toBe('Updated User');

    // Delete the user
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Verify deletion
    const deletedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(deletedUser).toBeNull();
  });

  it('exports Prisma types', async () => {
    // This test verifies that types are properly exported
    // by importing and using them (compilation would fail if not exported)
    const user: Parameters<typeof prisma.user.create>[0]['data'] = {
      discordId: 'type-test',
      displayName: 'Type Test',
    };
    expect(user.discordId).toBe('type-test');
  });
});
