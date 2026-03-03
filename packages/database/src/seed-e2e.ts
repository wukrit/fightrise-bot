/**
 * E2E Test Database Seeder
 *
 * Creates test data for E2E tests.
 * Run this before starting the Next.js server for E2E tests.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding E2E test database...');

  // Create a test user that matches the mock session
  const testUser = await prisma.user.upsert({
    where: { email: 'testplayer@example.com' },
    update: {},
    create: {
      discordId: '123456789012345678',
      discordUsername: 'TestPlayer',
      discordAvatar: null,
      email: 'testplayer@example.com',
      displayName: 'TestPlayer',
    },
  });

  console.log('Created test user:', testUser.id);

  // Create a test tournament
  const testTournament = await prisma.tournament.upsert({
    where: { startggId: 'e2e-test-tournament' },
    update: {},
    create: {
      startggId: 'e2e-test-tournament',
      startggSlug: 'e2e-test-tournament',
      name: 'E2E Test Tournament',
      state: 'IN_PROGRESS',
      discordGuildId: '123456789',
      discordChannelId: '123456789',
    },
  });

  console.log('Created test tournament:', testTournament.id);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
