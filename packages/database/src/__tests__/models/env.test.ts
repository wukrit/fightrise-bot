/**
 * Simple test to verify DATABASE_URL is available
 */

import { describe, it, expect } from 'vitest';

describe('Environment', () => {
  it('should have DATABASE_URL', () => {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    expect(process.env.DATABASE_URL).toBeDefined();
  });
});
