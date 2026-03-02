/**
 * Test to verify DATABASE_URL and run setup directly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('Direct Database Setup', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    // Get DATABASE_URL directly in this test file
    databaseUrl = process.env.DATABASE_URL;
    console.log('[test] DATABASE_URL:', databaseUrl);

    if (!databaseUrl) {
      throw new Error('DATABASE_URL not available in test');
    }

    // Find database package directory
    let databasePackageDir = '';
    const cwd = process.cwd();
    console.log('[test] cwd:', cwd);

    const webPath = path.join(cwd, '../../packages/database');
    if (fs.existsSync(path.join(webPath, 'prisma/schema.prisma'))) {
      databasePackageDir = webPath;
    } else if (fs.existsSync(path.join(cwd, 'prisma/schema.prisma'))) {
      databasePackageDir = cwd;
    } else if (fs.existsSync(path.join(cwd, 'packages/database/prisma/schema.prisma'))) {
      databasePackageDir = path.join(cwd, 'packages/database');
    }

    console.log('[test] databasePackageDir:', databasePackageDir);

    if (!databasePackageDir) {
      throw new Error('Could not find database package directory');
    }

    const schemaPath = path.join(databasePackageDir, 'prisma/schema.prisma');

    // Push schema
    execSync(`npx prisma db push --skip-generate --schema=${schemaPath}`, {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      cwd: databasePackageDir,
      stdio: 'inherit',
    });

    // Create Prisma client
    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('[test] Query result:', result);
    expect(result).toBeDefined();
  });

  it('should create user', async () => {
    const user = await prisma.user.create({
      data: {
        discordId: 'test-direct-' + Date.now(),
        displayName: 'Direct Test User',
      },
    });
    expect(user.id).toBeDefined();
    console.log('[test] Created user:', user.id);
  });
});
