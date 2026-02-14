/**
 * Smoke tests for Redis connection.
 *
 * These tests verify that Redis is accessible and basic operations work.
 * They require a valid REDIS_URL and are typically run in Docker with real services.
 *
 * Required environment variables:
 * - REDIS_URL: Redis connection string (e.g., redis://localhost:6379)
 *
 * NOTE: These tests read .env file directly to bypass vitest's automatic
 * redaction of sensitive environment variables (TOKEN, KEY, SECRET, etc.)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file directly to avoid vitest env redaction
function getEnvVar(key: string): string | undefined {
  // Try multiple paths for .env file
  const possiblePaths = [
    path.resolve(process.cwd(), '../../.env'),          // From bot test dir to root
    path.resolve(process.cwd(), '../../../.env'),       // From bot test dir alternative
    path.resolve(process.cwd(), '.env'),                // From bot root
  ];

  let envPath: string | undefined;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }

  if (!envPath) return undefined;

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

const redisUrl = getEnvVar('REDIS_URL');
const SKIP_SMOKE_TESTS = !redisUrl;

describe.skipIf(SKIP_SMOKE_TESTS)('Redis Connection Smoke Tests', () => {
  let client: Redis | null = null;

  beforeAll(async () => {
    if (!redisUrl) throw new Error('REDIS_URL is required');

    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    // Wait for initial connection (ioredis connects automatically)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
      client!.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      client!.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  afterAll(async () => {
    if (client) {
      await client.quit();
      client = null;
    }
  });

  describe('Redis Connection', () => {
    it('should connect to Redis', async () => {
      expect(client).toBeDefined();
      const result = await client!.ping();
      expect(result).toBe('PONG');
    });

    it('should have correct status after connection', () => {
      expect(client?.status).toBe('ready');
    });

    it('should get server info', async () => {
      const info = await client!.info();
      expect(info).toBeTruthy();
      expect(info).toContain('redis_version');
    });
  });

  describe('Basic Operations', () => {
    const testKey = 'smoke:test:basic';

    afterEach(async () => {
      if (client) {
        await client.del(testKey);
      }
    });

    it('should set and get a string value', async () => {
      await client!.set(testKey, 'hello');
      const value = await client!.get(testKey);
      expect(value).toBe('hello');
    });

    it('should set and get a number value', async () => {
      await client!.set(testKey, '42');
      const value = await client!.get(testKey);
      expect(value).toBe('42');
    });

    it('should set with expiration', async () => {
      await client!.set(testKey, 'expiring', 'EX', 10);
      const value = await client!.get(testKey);
      const ttl = await client!.ttl(testKey);
      expect(value).toBe('expiring');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    it('should delete keys', async () => {
      await client!.set(testKey, 'to-delete');
      await client!.del(testKey);
      const value = await client!.get(testKey);
      expect(value).toBeNull();
    });
  });

  describe('Hash Operations', () => {
    const testHashKey = 'smoke:test:hash';

    afterEach(async () => {
      if (client) {
        await client.del(testHashKey);
      }
    });

    it('should set and get hash values', async () => {
      await client!.hset(testHashKey, 'field1', 'value1');
      await client!.hset(testHashKey, 'field2', 'value2');
      const value = await client!.hget(testHashKey, 'field1');
      expect(value).toBe('value1');
    });

    it('should get all hash fields', async () => {
      await client!.hset(testHashKey, 'field1', 'value1');
      await client!.hset(testHashKey, 'field2', 'value2');
      const result = await client!.hgetall(testHashKey);
      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });
  });

  describe('Pub/Sub', () => {
    it('should publish and subscribe to a channel', async () => {
      const subscriber = new Redis(redisUrl!);

      const messagePromise = new Promise<string>((resolve) => {
        subscriber.subscribe('smoke:test:channel');
        subscriber.on('message', (channel, message) => {
          if (channel === 'smoke:test:channel') {
            resolve(message);
          }
        });
      });

      // Give subscriber time to connect
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Publish a message
      await client!.publish('smoke:test:channel', 'test-message');

      // Wait for message
      const message = await messagePromise;
      expect(message).toBe('test-message');

      await subscriber.quit();
    });
  });

  describe('Key Patterns', () => {
    const testPatternKeys = ['smoke:pattern:test1', 'smoke:pattern:test2'];

    beforeEach(async () => {
      if (client) {
        await client.set(testPatternKeys[0], 'value1');
        await client.set(testPatternKeys[1], 'value2');
      }
    });

    afterEach(async () => {
      if (client) {
        await client.del(...testPatternKeys);
      }
    });

    it('should find keys by pattern', async () => {
      const keys = await client!.keys('smoke:pattern:*');
      expect(keys).toHaveLength(2);
      expect(keys).toContain(testPatternKeys[0]);
      expect(keys).toContain(testPatternKeys[1]);
    });
  });
});

// Export skip flag for test runner
export { SKIP_SMOKE_TESTS };
