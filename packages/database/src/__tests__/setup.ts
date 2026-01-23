import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer | null = null;
let prisma: PrismaClient | null = null;

/**
 * Starts a PostgreSQL container for integration tests.
 * Uses Testcontainers to spin up an isolated database instance.
 */
export async function setupTestDatabase(): Promise<{
  prisma: PrismaClient;
  databaseUrl: string;
}> {
  // Start PostgreSQL container
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('fightrise_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = container.getConnectionUri();

  // Push schema to test database using Prisma
  execSync('npx prisma db push --skip-generate', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    cwd: process.cwd(),
    stdio: 'pipe',
  });

  // Create Prisma client connected to test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  await prisma.$connect();

  return { prisma, databaseUrl };
}

/**
 * Cleans up the test database and container.
 * Call this in afterAll() hook.
 */
export async function teardownTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }

  if (container) {
    await container.stop();
    container = null;
  }
}

/**
 * Clears all data from the test database.
 * Call this in beforeEach() to ensure test isolation.
 */
export async function clearTestDatabase(client: PrismaClient): Promise<void> {
  // Delete in order respecting foreign key constraints
  const tablesToClear = [
    'MatchPlayer',
    'Match',
    'Registration',
    'Event',
    'TournamentAdmin',
    'Tournament',
    'GuildConfig',
    'User',
  ];

  for (const table of tablesToClear) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

/**
 * Creates a test Prisma client connected to the test database URL.
 * Use this when you need a fresh client instance.
 */
export function createTestPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}
