/**
 * Test to verify DATABASE_URL in setup.ts context
 */

import { describe, it, expect } from 'vitest';
import { setupTestDatabase } from '../setup';

describe('Setup', () => {
  it('should see DATABASE_URL in setup', async () => {
    // Just try to call it and see what happens
    try {
      const result = await setupTestDatabase(getTestDatabaseUrl());
      console.log('setupTestDatabase succeeded!');
      console.log('databaseUrl:', result.databaseUrl);
    } catch (e: any) {
      console.log('setupTestDatabase failed:', e.message);
      throw e;
    }
  });
});
