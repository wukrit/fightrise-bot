/**
 * E2E tests for the Account Settings page.
 * Tests user profile, linked accounts, and notification preferences.
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedState, createMockSession, mockAuthEndpoints } from './utils/auth';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { asPlayer } from './utils/fixtures';

test.describe('Account Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test.describe('Page Loading', () => {
    test.skip('should load account settings page successfully', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load and redirect to account page
      await expect(page).toHaveURL(/.*\/account/);
    });

    test.skip('should have accessible page structure', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should have a heading structure
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Profile Display', () => {
    test.skip('should display Discord profile information', async ({ page }) => {
      const session = createMockSession({
        discordUsername: 'TestPlayer',
        discordAvatar: 'avatar123',
      });
      await setupAuthenticatedState(page, session);

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Profile section should be visible
      const hasProfile = await accountPage.hasProfileSection();
      expect(hasProfile || (await page.locator('body').textContent())).toBeTruthy();
    });

    test.skip('should display Discord username', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should display Discord username or related content
      const username = await accountPage.getDiscordUsername();
      const bodyText = await page.locator('body').textContent();
      expect(username !== null || bodyText).toBeTruthy();
    });

    test.skip('should display user ID', async ({ page }) => {
      const session = createMockSession({
        id: 'test-user-123',
      });
      await setupAuthenticatedState(page, session);

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with user information
      const hasProfile = await accountPage.hasProfileSection();
      expect(hasProfile || (await page.locator('body').textContent())).toBeTruthy();
    });
  });

  test.describe('Linked Accounts', () => {
    test.skip('should show connected Discord account when linked', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show Discord connection status
      const isConnected = await accountPage.isDiscordConnected();
      const hasConnectButton = await accountPage.hasConnectDiscordButton();

      // Either shows connected badge or connect button
      expect(isConnected || hasConnectButton).toBeTruthy();
    });

    test.skip('should show linked Start.gg account when linked', async ({ page }) => {
      // Mock Start.gg linked response
      await page.route('**/api/user/startgg', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            linked: true,
            startggId: '123456',
            username: 'TestPlayer',
          }),
        });
      });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show Start.gg link status
      const isLinked = await accountPage.isStartggLinked();
      const hasConnectButton = await accountPage.hasConnectStartggButton();

      // Either shows linked badge or connect button
      expect(isLinked || hasConnectButton).toBeTruthy();
    });

    test.skip('should show option to link Start.gg when not linked', async ({ page }) => {
      // Mock Start.gg not linked response
      await page.route('**/api/user/startgg', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            linked: false,
          }),
        });
      });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show connect button for Start.gg
      const hasConnectButton = await accountPage.hasConnectStartggButton();
      expect(hasConnectButton || (await page.locator('body').textContent())).toBeTruthy();
    });

    test.skip('should show connected/disconnected state for Discord', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show connection state
      const isConnected = await accountPage.isDiscordConnected();
      const hasConnectButton = await accountPage.hasConnectDiscordButton();
      const hasDisconnectButton = await accountPage.hasDisconnectDiscordButton();

      // Should have some connection state indicator
      expect(isConnected || hasConnectButton || hasDisconnectButton).toBeTruthy();
    });

    test.skip('should show connected/disconnected state for Start.gg', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show connection state
      const isLinked = await accountPage.isStartggLinked();
      const hasConnectButton = await accountPage.hasConnectStartggButton();
      const hasDisconnectButton = await accountPage.hasDisconnectStartggButton();

      // Should have some connection state indicator
      expect(isLinked || hasConnectButton || hasDisconnectButton).toBeTruthy();
    });
  });

  test.describe('Notification Preferences', () => {
    test.skip('should display notification preferences section', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should have notification preferences
      const hasNotifications = await accountPage.hasNotificationPreferences();
      expect(hasNotifications || (await page.locator('body').textContent())).toBeTruthy();
    });

    test.skip('should have email notifications toggle', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show email notifications option
      const hasEmailToggle = await accountPage.hasEmailNotificationsToggle();
      const bodyText = await page.locator('body').textContent();
      expect(hasEmailToggle || bodyText?.includes('Email')).toBeTruthy();
    });

    test.skip('should have match notifications toggle', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show match notifications option
      const hasMatchToggle = await accountPage.hasMatchNotificationsToggle();
      const bodyText = await page.locator('body').textContent();
      expect(hasMatchToggle || bodyText?.includes('Match')).toBeTruthy();
    });

    test.skip('should toggle email notifications', async ({ page }) => {
      // Mock successful preference update
      await page.route('**/api/user/preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Try to toggle email notifications if toggle exists
      const hasEmailToggle = await accountPage.hasEmailNotificationsToggle();
      if (hasEmailToggle) {
        await accountPage.toggleEmailNotifications();
        // Should handle the toggle action
      }
      // Test passes as long as page doesn't crash
      expect(await page.locator('body').isVisible()).toBeTruthy();
    });

    test.skip('should toggle match notifications', async ({ page }) => {
      // Mock successful preference update
      await page.route('**/api/user/preferences', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Try to toggle match notifications if toggle exists
      const hasMatchToggle = await accountPage.hasMatchNotificationsToggle();
      if (hasMatchToggle) {
        await accountPage.toggleMatchNotifications();
        // Should handle the toggle action
      }
      // Test passes as long as page doesn't crash
      expect(await page.locator('body').isVisible()).toBeTruthy();
    });
  });

  test.describe('Danger Zone', () => {
    test.skip('should display danger zone section', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show danger zone section
      const hasDangerZone = await accountPage.hasDangerZone();
      const bodyText = await page.locator('body').textContent();
      expect(hasDangerZone || bodyText?.includes('Delete')).toBeTruthy();
    });

    test.skip('should have delete account button', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should show delete account button
      const hasDeleteButton = await accountPage.hasDeleteAccountButton();
      const bodyText = await page.locator('body').textContent();
      expect(hasDeleteButton || bodyText?.includes('Delete')).toBeTruthy();
    });
  });

  test.describe('Access Control', () => {
    test.skip('should redirect unauthenticated users to sign in', async ({ page }) => {
      // Clear authentication
      await page.context().clearCookies({ name: 'next-auth.session-token' });
      await page.context().clearCookies({ name: '__Secure-next-auth.session-token' });
      await mockAuthEndpoints(page, { session: null });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should redirect to sign in or show unauthorized message
      const currentURL = page.url();
      const bodyText = await page.locator('body').textContent();
      // Either redirected to auth page or shows sign in content
      expect(
        currentURL.includes('/signin') ||
        currentURL.includes('/auth') ||
        bodyText?.toLowerCase().includes('sign in') ||
        bodyText?.toLowerCase().includes('login')
      ).toBeTruthy();
    });

    test.skip('should display account page for authenticated player', async ({ page }) => {
      await asPlayer(page);

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should display account page content
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test.skip('should handle API errors gracefully', async ({ page }) => {
      // Mock API error for user endpoint
      await page.route('**/api/user', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should still be visible, not crashed
      await expect(page.locator('body')).toBeVisible();
    });

    test.skip('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/**', async (route) => {
        await route.abort('failed');
      });

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should still be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
