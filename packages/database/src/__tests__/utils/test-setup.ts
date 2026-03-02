/**
 * Shared test setup helper - bypasses vitest module isolation issues
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const SCHEMA_PATH = '/app/packages/database/prisma/schema.prisma';

export async function createTestPrisma(): Promise<{ prisma: PrismaClient; databaseUrl: string }> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not available');
  }

  // Push schema
  execSync(`npx prisma db push --skip-generate --schema=${SCHEMA_PATH}`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    cwd: '/app/packages/database',
  });

  // Create client
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  await prisma.$connect();

  return { prisma, databaseUrl };
}

export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  const tables = ['MatchPlayer', 'Match', 'Registration', 'Event', 'TournamentAdmin', 'Tournament', 'GuildConfig', 'User'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}
