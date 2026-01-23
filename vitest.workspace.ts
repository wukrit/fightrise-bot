import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Apps
  {
    extends: './apps/bot/vitest.config.ts',
    test: {
      name: 'bot',
      root: './apps/bot',
    },
  },
  {
    extends: './apps/web/vitest.config.ts',
    test: {
      name: 'web',
      root: './apps/web',
    },
  },
  // Packages
  {
    extends: './packages/database/vitest.config.ts',
    test: {
      name: 'database',
      root: './packages/database',
    },
  },
  {
    extends: './packages/startgg-client/vitest.config.ts',
    test: {
      name: 'startgg-client',
      root: './packages/startgg-client',
    },
  },
  {
    extends: './packages/shared/vitest.config.ts',
    test: {
      name: 'shared',
      root: './packages/shared',
    },
  },
]);
