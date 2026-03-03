/**
 * Authentication utilities for Playwright E2E tests.
 *
 * These utilities mock NextAuth session endpoints to avoid
 * needing real Discord OAuth during E2E tests.
 */

import { Page, Route, Cookie } from '@playwright/test';
import { SignJWT } from 'jose';

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
  email: 'testplayer@example.com',
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

/**
 * Generate a valid NextAuth JWT token for middleware authentication.
 * This creates a properly signed JWT that next-auth/middleware will recognize.
 *
 * The payload must match the JWT structure defined in apps/web/lib/auth.ts:
 * - userId: string (custom field from jwt callback)
 * - discordId: string (custom field from jwt callback)
 * - discordUsername: string (custom field from jwt callback)
 * - discordAvatar: string | null (custom field from jwt callback)
 * - sub: string (standard JWT subject claim, the user ID)
 * - name: string (display name)
 * - iat: number (issued at timestamp)
 * - exp: number (expiration timestamp)
 *
 * @param session - The mock session data to encode
 * @param secret - The NEXTAUTH_SECRET to sign with (defaults to test secret)
 * @returns The encoded JWT token
 */
export async function generateNextAuthToken(
  session: MockSession,
  secret = 'test-nextauth-secret'
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const now = Math.floor(Date.now() / 1000);
  const exp = Math.floor(new Date(session.expires).getTime() / 1000);

  // Create JWT payload matching the custom JWT structure from apps/web/lib/auth.ts
  // These fields are added by the jwt callback and read by the session callback
  const payload = {
    sub: session.user.id, // Subject (user ID) - standard JWT claim, maps to user.id
    name: session.user.discordUsername, // Display name
    email: session.user.email, // Email (null for Discord)
    picture: session.user.discordAvatar, // Avatar URL
    // Custom fields added by the jwt callback in lib/auth.ts:
    userId: session.user.id,
    discordId: session.user.discordId,
    discordUsername: session.user.discordUsername,
    discordAvatar: session.user.discordAvatar,
    iat: now,
    exp: exp,
    jti: `test-jti-${Date.now()}`,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secretKey);

  return token;
}

/**
 * Set the NextAuth session cookie for middleware authentication.
 * This sets the JWT cookie that next-auth/middleware will read.
 *
 * @param page - Playwright page
 * @param session - Mock session (defaults to default mock user)
 * @param secret - NEXTAUTH_SECRET for signing
 */
export async function setSessionCookie(
  page: Page,
  session: MockSession = createMockSession(),
  secret = 'test-nextauth-secret'
): Promise<void> {
  const token = await generateNextAuthToken(session, secret);

  const cookie: Cookie = {
    name: 'next-auth.session-token',
    value: token,
    domain: 'localhost',
    path: '/',
    expires: Math.floor(new Date(session.expires).getTime() / 1000),
    httpOnly: true,
    secure: false, // localhost is not secure
    sameSite: 'Lax',
  };

  await page.context().addCookies([cookie]);
}

/**
 * Setup authenticated state for a test.
 * This sets the session cookie AND mocks the API endpoints.
 * Call this in test.beforeEach or before navigating to protected routes.
 *
 * @example
 * ```ts
 * test.beforeEach(async ({ page }) => {
 *   await setupAuthenticatedState(page);
 * });
 *
 * test('access protected route', async ({ page }) => {
 *   await page.goto('/dashboard');
 *   // User is authenticated via cookie and API mock
 * });
 * ```
 */
export async function setupAuthenticatedState(
  page: Page,
  session: MockSession = createMockSession()
): Promise<void> {
  // Set cookie for middleware authentication
  await setSessionCookie(page, session);

  // Mock API endpoints for client-side session
  await mockAuthEndpoints(page, { session });
}

/**
 * Setup unauthenticated state for a test.
 * Clears any session cookies and mocks unauthenticated API state.
 */
export async function setupUnauthenticatedState(page: Page): Promise<void> {
  // Clear session cookies
  await page.context().clearCookies({ name: 'next-auth.session-token' });
  await page.context().clearCookies({ name: '__Secure-next-auth.session-token' });

  // Mock unauthenticated API state
  await mockUnauthenticatedState(page);
}
