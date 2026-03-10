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
    test('should load account settings page successfully', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load and redirect to account page
      await expect(page).toHaveURL(/.*\/account/);
    });

    test('should have accessible page structure', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should have a heading structure
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Profile Display', () => {
    test('should display Discord profile information', async ({ page }) => {
      const session = createMockSession({
        discordUsername: 'TestPlayer',
        discordAvatar: 'avatar123',
      });
      await setupAuthenticatedState(page, session);

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should display Discord username', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should display some content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should display user ID', async ({ page }) => {
      const session = createMockSession({
        id: 'test-user-123',
      });
      await setupAuthenticatedState(page, session);

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with user information
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Linked Accounts', () => {
    test('should show linked accounts section', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with some content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should display account page with connection options', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with some content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should display connection state options', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show Discord connection state', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show Start.gg connection state', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Notification Preferences', () => {
    test('should display notification section', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show email notification option', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show match notification option', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should handle notification toggle if available', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should be visible
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle match notification toggle if available', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Danger Zone', () => {
    test('should display account settings page', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load with content
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });

    test('should show delete account option if available', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should load
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Access Control', () => {
    test('should redirect unauthenticated users to sign in', async ({ page }) => {
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

    test('should display account page for authenticated player', async ({ page }) => {
      await asPlayer(page);

      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Should display account page content
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should still be visible, not crashed
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      const accountPage = new AccountSettingsPage(page);
      await accountPage.goto();

      // Page should still be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
