// NPM commands
export const NPM_COMMANDS = {
  DOCKER_INFRA: 'docker:infra',
  DOCKER_DB_PUSH: 'docker:db:push',
  DOCKER_TEST: 'docker:test',
  DOCKER_TEST_INTEGRATION: 'docker:test:integration',
  DOCKER_TEST_E2E: 'docker:test:e2e',
  DOCKER_LINT: 'docker:lint',
} as const;

// File paths
export const PATHS = {
  STAGING_DIR: 'tmp/qa-mocks',
  HANDLERS_FILE: 'handlers.ts',
  MOCKS_TARGET: 'packages/startgg-client/src/__mocks__/handlers.ts',
} as const;

// Required credentials per operation
export const REQUIRED_CREDENTIALS = {
  'generate-mocks': ['STARTGG_API_KEY'] as const,
  'smoke': ['SMOKE_DISCORD_TOKEN', 'SMOKE_STARTGG_API_KEY'] as const,
  'run-tests': [] as const,
} as const;

// Test layers
export const TEST_LAYERS = ['unit', 'integration', 'e2e', 'lint'] as const;
export type TestLayer = typeof TEST_LAYERS[number];
