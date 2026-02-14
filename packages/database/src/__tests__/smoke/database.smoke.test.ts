/**
 * Smoke tests for Database connection.
 *
 * These tests verify that the database connection works and basic operations succeed.
 * They require a valid DATABASE_URL and are typically run in Docker with real services.
 *
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string
 *
 * NOTE: These tests read .env file directly to bypass vitest's automatic
 * redaction of sensitive environment variables (TOKEN, KEY, SECRET, etc.)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file directly to avoid vitest env redaction
function getEnvVar(key: string): string | undefined {
  const envPath = path.resolve(process.cwd(), '../../.env');
  if (!fs.existsSync(envPath)) return undefined;

  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) return undefined;
  // Strip surrounding quotes if present
  let value = match[1].trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return value;
}

const databaseUrl = getEnvVar('DATABASE_URL');
const SKIP_SMOKE_TESTS = !databaseUrl;

describe.skipIf(SKIP_SMOKE_TESTS)('Database Connection Smoke Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('DATABASE_URL is required');

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ['error'],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      // Simple connection test
      await prisma.$connect();
      expect(prisma.$isConnected()).toBe(true);
    });

    it('should execute a basic query', async () => {
      // Test basic query capability
      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
    });

    it('should query database version', async () => {
      const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
      expect(result).toBeDefined();
      expect(result[0]?.version).toBeTruthy();
      expect(result[0]?.version).toContain('PostgreSQL');
    });

    it('should list all tables', async () => {
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
      `;
      expect(result).toBeDefined();
      // We expect at least some tables to exist in the schema
      const tableNames = result.map((r) => r.tablename);
      console.log('Found tables:', tableNames.join(', '));
    });
  });

  describe('Database Schema', () => {
    it('should have expected tables', async () => {
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
      `;

      const tableNames = result.map((r) => r.tablename);

      // Check for key tables in our schema
      expect(tableNames).toContain('User');
      expect(tableNames).toContain('Tournament');
      expect(tableNames).toContain('Event');
      expect(tableNames).toContain('Match');
    });

    it('should be able to read from User table', async () => {
      // This will return empty in fresh database, but tests the query works
      const users = await prisma.user.findMany({ take: 1 });
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('Transaction Support', () => {
    it('should execute transactions', async () => {
      const result = await prisma.$transaction(async (tx) => {
        return await tx.$queryRaw`SELECT 1 as value`;
      });
      expect(result).toBeDefined();
    });
  });
});

// Export skip flag for test runner
export { SKIP_SMOKE_TESTS };
