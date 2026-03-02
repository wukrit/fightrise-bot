import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

let container: StartedPostgreSqlContainer | null = null;
let prisma: PrismaClient | null = null;

/**
 * Starts a PostgreSQL container for integration tests.
 * Uses Testcontainers to spin up an isolated database instance,
 * OR uses an existing DATABASE_URL if provided (for CI environments).
 *
 * @param overrideUrl - Optional DATABASE_URL to use (useful when env var isn't passed to worker)
 */
export async function setupTestDatabase(overrideUrl?: string): Promise<{
  prisma: PrismaClient;
  databaseUrl: string;
}> {
  // IMMEDIATE LOG - this should appear first
  process.stderr.write('[setupTestDatabase] FUNCTION STARTED\n');

  // Check for override or environment variable
  const providedDatabaseUrl = overrideUrl || process.env.DATABASE_URL;

  if (providedDatabaseUrl) {
    process.stderr.write('[setupTestDatabase] URL FOUND, using it\n');
    // Use existing database (CI environment)
    console.log('Using existing database from DATABASE_URL');

    // Determine the database package directory based on where we're running from
    let databasePackageDir = '';
    const cwd = process.cwd();

    // First try: running from apps/web
    const webPath = path.join(cwd, '../../packages/database');
    if (fs.existsSync(path.join(webPath, 'prisma/schema.prisma'))) {
      databasePackageDir = webPath;
    }
    // Second try: running from packages/database
    else if (fs.existsSync(path.join(cwd, 'prisma/schema.prisma'))) {
      databasePackageDir = cwd;
    }
    // Third try: running from repo root
    else if (fs.existsSync(path.join(cwd, 'packages/database/prisma/schema.prisma'))) {
      databasePackageDir = path.join(cwd, 'packages/database');
    }

    if (!databasePackageDir) {
      throw new Error(`Could not find database package directory. cwd=${cwd}`);
    }

    const schemaPath = path.join(databasePackageDir, 'prisma/schema.prisma');
    console.log('Using schema path:', schemaPath);

    // Push schema to existing test database
    execSync(`npx prisma db push --skip-generate --schema=${schemaPath}`, {
      env: {
        ...process.env,
        DATABASE_URL: providedDatabaseUrl,
      },
      cwd: databasePackageDir,
      stdio: 'inherit',
    });

    // Create Prisma client connected to existing database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: providedDatabaseUrl,
        },
      },
    });

    await prisma.$connect();
    return { prisma, databaseUrl: providedDatabaseUrl };
  }

  // Start PostgreSQL container (local development)
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('fightrise_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = container.getConnectionUri();

  // Determine the database package directory based on where we're running from
  // When running tests from apps/web: process.cwd() = /home/ubuntu/fightrise-bot/apps/web
  // When running tests from packages/database: process.cwd() = /home/ubuntu/fightrise-bot/packages/database

  let databasePackageDir = '';
  const cwd = process.cwd();

  // First try: running from apps/web
  const webPath = path.join(cwd, '../../packages/database');
  if (fs.existsSync(path.join(webPath, 'prisma/schema.prisma'))) {
    databasePackageDir = webPath;
  }
  // Second try: running from packages/database
  else if (fs.existsSync(path.join(cwd, 'prisma/schema.prisma'))) {
    databasePackageDir = cwd;
  }
  // Third try: running from repo root
  else if (fs.existsSync(path.join(cwd, 'packages/database/prisma/schema.prisma'))) {
    databasePackageDir = path.join(cwd, 'packages/database');
  }

  if (!databasePackageDir) {
    throw new Error(`Could not find database package directory. cwd=${cwd}`);
  }

  const schemaPath = path.join(databasePackageDir, 'prisma/schema.prisma');
  console.log('Using schema path:', schemaPath);

  // Push schema to test database using Prisma with explicit schema path
  execSync(`npx prisma db push --skip-generate --schema=${schemaPath}`, {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    cwd: databasePackageDir,
    stdio: 'inherit',
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
