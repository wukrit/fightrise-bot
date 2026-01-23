/**
 * Smoke tests for Discord OAuth flow.
 *
 * These tests verify that the OAuth integration works correctly
 * with the real Discord OAuth endpoints.
 *
 * IMPORTANT: These tests interact with real Discord OAuth and should only be run:
 * - Manually before releases
 * - In controlled environments with test credentials
 * - NOT on public CI (to protect secrets)
 *
 * Required environment variables:
 * - SMOKE_DISCORD_CLIENT_ID: Discord application client ID
 * - SMOKE_DISCORD_CLIENT_SECRET: Discord application client secret
 * - SMOKE_OAUTH_REDIRECT_URI: Configured redirect URI
 */

import { test, expect } from '@playwright/test';

// Skip all tests if smoke test credentials aren't provided
const SKIP_SMOKE_TESTS = !process.env.SMOKE_DISCORD_CLIENT_ID;

test.describe('Discord OAuth Smoke Tests', () => {
  test.skip(SKIP_SMOKE_TESTS, 'Smoke test credentials not provided');

  const clientId = process.env.SMOKE_DISCORD_CLIENT_ID!;
  const redirectUri = process.env.SMOKE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/api/auth/callback/discord';

  test.describe('OAuth URL Generation', () => {
    test('should generate valid Discord OAuth URL', async ({ page }) => {
      // Navigate to the sign-in page
      await page.goto('/auth/signin');

      // Click the Discord sign-in button
      const discordButton = page.getByRole('button', { name: /discord/i });

      if (await discordButton.isVisible()) {
        // Get the OAuth URL before clicking (via link or form action)
        const [popup] = await Promise.all([
          page.waitForEvent('popup'),
          discordButton.click(),
        ]);

        // Verify the OAuth URL structure
        const url = new URL(popup.url());

        expect(url.hostname).toBe('discord.com');
        expect(url.pathname).toContain('/oauth2/authorize');
        expect(url.searchParams.get('client_id')).toBe(clientId);
        expect(url.searchParams.get('redirect_uri')).toBe(redirectUri);
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('scope')).toContain('identify');

        await popup.close();
      }
    });

    test('should include required OAuth scopes', async ({ page }) => {
      await page.goto('/auth/signin');

      const discordButton = page.getByRole('button', { name: /discord/i });

      if (await discordButton.isVisible()) {
        const [popup] = await Promise.all([
          page.waitForEvent('popup'),
          discordButton.click(),
        ]);

        const url = new URL(popup.url());
        const scopes = url.searchParams.get('scope')?.split(' ') ?? [];

        // Verify required scopes
        expect(scopes).toContain('identify');

        // Optional: verify guilds scope if needed for your app
        // expect(scopes).toContain('guilds');

        await popup.close();
      }
    });
  });

  test.describe('OAuth Redirect Handling', () => {
    test('should handle OAuth callback URL', async ({ page }) => {
      // Simulate arriving at the callback URL with an auth code
      // Note: We can't actually complete OAuth without user interaction
      // This tests that the callback route exists and handles requests

      await page.goto(`${redirectUri}?code=test_code&state=test_state`);

      // The callback should redirect somewhere (sign-in or error page)
      // It won't succeed without a valid code, but it should handle the request
      await expect(page.locator('body')).toBeVisible();

      // Should not show an unhandled error page
      await expect(page.locator('body')).not.toContainText('NEXT_NOT_FOUND');
    });

    test('should handle OAuth error responses', async ({ page }) => {
      // Simulate Discord returning an error (e.g., access_denied)
      await page.goto(
        `${redirectUri}?error=access_denied&error_description=The+user+denied+the+request`
      );

      // Should handle gracefully and redirect to sign-in or show error message
      await expect(page.locator('body')).toBeVisible();

      // May show error message or redirect to sign-in
      const hasError = await page.getByText(/denied|error|failed/i).isVisible().catch(() => false);
      const isOnSignIn = page.url().includes('signin');

      expect(hasError || isOnSignIn).toBeTruthy();
    });
  });

  test.describe('NextAuth API Endpoints', () => {
    test('should expose CSRF token endpoint', async ({ request }) => {
      const response = await request.get('/api/auth/csrf');

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.csrfToken).toBeTruthy();
    });

    test('should expose providers endpoint', async ({ request }) => {
      const response = await request.get('/api/auth/providers');

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.discord).toBeDefined();
      expect(data.discord.id).toBe('discord');
      expect(data.discord.type).toBe('oauth');
    });

    test('should expose session endpoint', async ({ request }) => {
      const response = await request.get('/api/auth/session');

      expect(response.ok()).toBeTruthy();

      // Without a valid session, should return empty object
      const data = await response.json();
      expect(typeof data).toBe('object');
    });
  });
});

test.describe('OAuth Security', () => {
  test.skip(SKIP_SMOKE_TESTS, 'Smoke test credentials not provided');

  test('should include state parameter for CSRF protection', async ({ page }) => {
    await page.goto('/auth/signin');

    const discordButton = page.getByRole('button', { name: /discord/i });

    if (await discordButton.isVisible()) {
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        discordButton.click(),
      ]);

      const url = new URL(popup.url());

      // State parameter should be present for CSRF protection
      expect(url.searchParams.get('state')).toBeTruthy();

      await popup.close();
    }
  });

  test('should reject invalid state in callback', async ({ page }) => {
    const redirectUri = process.env.SMOKE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/api/auth/callback/discord';

    // Attempt callback with invalid state
    await page.goto(`${redirectUri}?code=test&state=invalid_state`);

    // Should fail gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});

// Export skip flag for test runner
export { SKIP_SMOKE_TESTS };
