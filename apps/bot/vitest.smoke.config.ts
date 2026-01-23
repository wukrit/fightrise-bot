import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/smoke/**/*.test.ts'],
    // Longer timeout for real API calls
    testTimeout: 60000,
    hookTimeout: 60000,
    globals: true,
    // Run smoke tests sequentially to avoid rate limits
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
