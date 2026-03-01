/**
 * Role-based test fixtures for E2E tests.
 * Extends Playwright test with authentication helpers.
 */

import { test as base, Page, expect, Locator } from '@playwright/test';
import {
  createMockSession,
  MockSession,
  setupAuthenticatedState,
  setupUnauthenticatedState,
} from './auth';


/**
 * Extended test context with authentication helpers.
 */
interface AuthenticatedTestContext {
  page: Page;
  mockSession: MockSession;
}

/**
 * Custom test fixture that provides authenticated test context.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Set up authenticated state with default mock user
    const session = createMockSession();
    await setupAuthenticatedState(page, session);
    await use(page);
  },
});

export { base as baseTest };

/**
 * Create an admin user session.
 */
export function createAdminSession(overrides?: Partial<MockSession['user']>): MockSession {
  return createMockSession({
    id: 'admin-user-cuid-456',
    discordId: '987654321098765432',
    discordUsername: 'AdminUser',
    name: 'AdminUser',
    ...overrides,
  });
}

/**
 * Create a tournament admin user session.
 */
export function createTournamentAdminSession(
  overrides?: Partial<MockSession['user']>
): MockSession {
  return createMockSession({
    id: 'tournament-admin-cuid-789',
    discordId: '111222333444555666',
    discordUsername: 'TournamentAdmin',
    name: 'TournamentAdmin',
    ...overrides,
  });
}

/**
 * Create a regular player user session.
 */
export function createPlayerSession(overrides?: Partial<MockSession['user']>): MockSession {
  return createMockSession({
    id: 'player-user-cuid-101',
    discordId: '555444333222111000',
    discordUsername: 'RegularPlayer',
    name: 'RegularPlayer',
    ...overrides,
  });
}

/**
 * Create an authenticated test page with admin privileges.
 */
export async function asAdmin(page: Page): Promise<void> {
  const session = createAdminSession();
  await setupAuthenticatedState(page, session);
}

/**
 * Create an authenticated test page with tournament admin privileges.
 */
export async function asTournamentAdmin(page: Page): Promise<void> {
  const session = createTournamentAdminSession();
  await setupAuthenticatedState(page, session);
}

/**
 * Create an authenticated test page with regular player privileges.
 */
export async function asPlayer(page: Page): Promise<void> {
  const session = createPlayerSession();
  await setupAuthenticatedState(page, session);
}

/**
 * Create an unauthenticated test page.
 */
export async function asGuest(page: Page): Promise<void> {
  await setupUnauthenticatedState(page);
}

/**
 * Extended expect with custom matchers for E2E tests.
 */
export const expectCustom = expect.extend({
  /**
   * Custom matcher to check if an element contains text.
   */
  async toContainTextContent(received: Locator, expected: string) {
    const actual = await received.textContent();
    const pass = actual?.includes(expected);
    return {
      pass,
      message: () => `Expected element to contain "${expected}", but got "${actual}"`,
    };
  },
});
