import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/smoke/**/*.test.ts'],
    // Longer timeout for database operations
    testTimeout: 60000,
    hookTimeout: 60000,
    globals: true,
  },
});
