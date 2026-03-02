/**
 * Shared test setup helper - bypasses vitest module isolation issues
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

// Use dynamic paths that work in both Docker and CI environments
// In Docker: process.cwd() = /app (or /app/packages/database when cd'd into package)
// In CI: process.cwd() = workspace root
let PACKAGE_ROOT: string;
if (process.env.DOCKER_CONTAINER === 'true' || process.cwd().endsWith('/packages/database')) {
  // Already in the package directory inside Docker
  PACKAGE_ROOT = process.cwd().endsWith('/packages/database') ? process.cwd() : '/app/packages/database';
} else {
  // Running from workspace root (CI or local)
  PACKAGE_ROOT = path.join(process.cwd(), 'packages/database');
}
const SCHEMA_PATH = path.join(PACKAGE_ROOT, 'prisma/schema.prisma');

export async function createTestPrisma(): Promise<{ prisma: PrismaClient; databaseUrl: string }> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not available');
  }

  // Push schema
  execSync(`npx prisma db push --skip-generate --schema=${SCHEMA_PATH}`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    cwd: PACKAGE_ROOT,
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
