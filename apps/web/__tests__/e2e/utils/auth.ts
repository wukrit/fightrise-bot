/**
 * Authentication utilities for Playwright E2E tests.
 *
 * These utilities mock NextAuth session endpoints to avoid
 * needing real Discord OAuth during E2E tests.
 */

import { Page, Route } from '@playwright/test';

/**
 * Mock session data structure matching NextAuth's session format.
 */
export interface MockSession {
  user: {
    id: string;
    discordId: string;
    discordUsername: string;
    discordAvatar: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

/**
 * Default mock user for tests.
 */
export const defaultMockUser: MockSession['user'] = {
  id: 'test-user-cuid-123',
  discordId: '123456789012345678',
  discordUsername: 'TestPlayer',
  discordAvatar: null,
  name: 'TestPlayer',
  email: null,
  image: null,
};

/**
 * Create a mock session with optional overrides.
 */
export function createMockSession(
  userOverrides: Partial<MockSession['user']> = {}
): MockSession {
  // Expires in 30 days
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    user: {
      ...defaultMockUser,
      ...userOverrides,
    },
    expires,
  };
}

/**
 * Mock the NextAuth session API endpoint.
 * This intercepts calls to /api/auth/session and returns a mock session.
 *
 * @example
 * ```ts
 * test('authenticated page', async ({ page }) => {
 *   await mockAuthSession(page); // User is now "logged in"
 *   await page.goto('/dashboard');
 *   // Page loads as if user is authenticated
 * });
 * ```
 */
export async function mockAuthSession(
  page: Page,
  session: MockSession | null = createMockSession()
): Promise<void> {
  await page.route('**/api/auth/session', async (route: Route) => {
    // Return the mock session data
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session ?? {}),
    });
  });
}

/**
 * Mock an unauthenticated state.
 * The session endpoint returns an empty object.
 */
export async function mockUnauthenticatedState(page: Page): Promise<void> {
  await mockAuthSession(page, null);
}

/**
 * Mock the NextAuth CSRF token endpoint.
 * Required for sign-in/sign-out operations.
 */
export async function mockCsrfToken(
  page: Page,
  csrfToken = 'mock-csrf-token-123'
): Promise<void> {
  await page.route('**/api/auth/csrf', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken }),
    });
  });
}

/**
 * Mock the NextAuth providers endpoint.
 */
export async function mockProviders(page: Page): Promise<void> {
  await page.route('**/api/auth/providers', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        discord: {
          id: 'discord',
          name: 'Discord',
          type: 'oauth',
          signinUrl: '/api/auth/signin/discord',
          callbackUrl: '/api/auth/callback/discord',
        },
      }),
    });
  });
}

/**
 * Mock all NextAuth endpoints for a fully mocked auth experience.
 * Call this at the start of tests that need authentication.
 */
export async function mockAuthEndpoints(
  page: Page,
  options: {
    session?: MockSession | null;
    csrfToken?: string;
  } = {}
): Promise<void> {
  await Promise.all([
    mockAuthSession(page, options.session ?? createMockSession()),
    mockCsrfToken(page, options.csrfToken),
    mockProviders(page),
  ]);
}

/**
 * Helper to sign in as a specific mock user.
 * Mocks the session endpoint and reloads the page.
 */
export async function signInAsMockUser(
  page: Page,
  userOverrides: Partial<MockSession['user']> = {}
): Promise<MockSession> {
  const session = createMockSession(userOverrides);
  await mockAuthEndpoints(page, { session });

  // If we're already on a page, reload to apply the mock
  if (page.url() !== 'about:blank') {
    await page.reload();
  }

  return session;
}

/**
 * Helper to sign out (mock unauthenticated state).
 */
export async function signOut(page: Page): Promise<void> {
  await mockUnauthenticatedState(page);
  await page.reload();
}

/**
 * Test fixture type for authenticated tests.
 */
export interface AuthTestContext {
  mockSession: MockSession;
  signInAs: (userOverrides?: Partial<MockSession['user']>) => Promise<MockSession>;
  signOut: () => Promise<void>;
}

/**
 * Create an auth test context for use in tests.
 */
export function createAuthTestContext(page: Page): AuthTestContext {
  let mockSession = createMockSession();

  return {
    get mockSession() {
      return mockSession;
    },
    async signInAs(userOverrides = {}) {
      mockSession = await signInAsMockUser(page, userOverrides);
      return mockSession;
    },
    async signOut() {
      await signOut(page);
    },
  };
}
