import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for FightRise web E2E tests.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './apps/web/__tests__/e2e',

  // Global setup runs before any tests
  globalSetup: './apps/web/__tests__/e2e/global-setup.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 1 : 0,

  // Run tests in parallel on CI for better performance
  workers: process.env.CI ? 2 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // Default to localhost:4000 which is where the Docker web container runs
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  // Only chromium is installed in the Docker container
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting the tests
  // Starts by default, use USE_EXISTING_SERVER=true to reuse an existing server
  webServer: {
    command: 'cd apps/web && npx next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.USE_EXISTING_SERVER === 'true',
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      E2E_AUTH_BYPASS: 'true',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-nextauth-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'dummy-client-id',
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || 'dummy-client-secret',
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
    },
  },
});
