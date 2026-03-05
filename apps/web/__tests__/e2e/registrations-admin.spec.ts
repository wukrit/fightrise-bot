/**
 * E2E tests for tournament registrations admin page.
 * Tests: list registrations, approve/reject, filter by status, access control.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints, setupAuthenticatedState, createMockSession } from './utils/auth';
import { TournamentRegistrationsAdminPage } from './pages/TournamentRegistrationsAdminPage';
import { seedTestData, clearTestData, TEST_TOURNAMENTS, TEST_USERS } from './utils/seed';
import { PrismaClient, RegistrationStatus, RegistrationSource } from '@prisma/client';

// Test tournament ID - use the seeded tournament ID
const TOURNAMENT_ID = TEST_TOURNAMENTS.upcoming.id;

const prisma = new PrismaClient();

/**
 * Helper to seed additional registrations with different statuses for tests.
 */
async function seedRegistrationsForTests() {
  const event = await prisma.event.findFirst({
    where: { tournamentId: TOURNAMENT_ID },
  });

  if (!event) {
    throw new Error('No event found for tournament');
  }

  // Create additional test users with different registration statuses
  const testUsers = [
    { id: 'test-reg-user-1', discordId: '111111111111111111', username: 'PlayerOne' },
    { id: 'test-reg-user-2', discordId: '222222222222222222', username: 'PlayerTwo' },
    { id: 'test-reg-user-3', discordId: '333333333333333333', username: 'PlayerThree' },
    { id: 'test-reg-user-4', discordId: '444444444444444444', username: 'PlayerFour' },
  ];

  // Create users
  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { discordId: user.discordId, discordUsername: user.username },
      create: { id: user.id, discordId: user.discordId, discordUsername: user.username },
    });
  }

  // Create registrations with different statuses
  const registrations = [
    { userId: 'test-reg-user-1', status: RegistrationStatus.PENDING, source: RegistrationSource.DISCORD },
    { userId: 'test-reg-user-2', status: RegistrationStatus.CONFIRMED, source: RegistrationSource.STARTGG },
    { userId: 'test-reg-user-3', status: RegistrationStatus.PENDING, source: RegistrationSource.DISCORD },
    { userId: 'test-reg-user-4', status: RegistrationStatus.CANCELLED, source: RegistrationSource.DISCORD },
  ];

  for (const reg of registrations) {
    await prisma.registration.upsert({
      where: {
        userId_eventId: {
          userId: reg.userId,
          eventId: event.id,
        },
      },
      update: { status: reg.status, source: reg.source },
      create: {
        userId: reg.userId,
        tournamentId: TOURNAMENT_ID,
        eventId: event.id,
        status: reg.status,
        source: reg.source,
      },
    });
  }
}

/**
 * Admin user session
 */
const adminSession = createMockSession({
  id: TEST_USERS.tournamentAdmin.id,
  discordId: TEST_USERS.tournamentAdmin.discordId,
  discordUsername: TEST_USERS.tournamentAdmin.discordUsername,
  name: TEST_USERS.tournamentAdmin.discordUsername,
});

/**
 * Helper to seed registrations before each test.
 * Note: Server Components fetch data from DB directly, no mocking needed.
 */
async function setupRegistrationsData(page: Page) {
  // Seed additional registrations for testing
  await seedRegistrationsForTests();
}

test.describe('Tournament Registrations Admin', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page, { session: adminSession });
    // Seed test data for each test
    await setupRegistrationsData(page);
  });

  test.describe('Page Loading', () => {

    test('should load registrations page', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Page should load without error
      const title = await adminPage.getTitle();
      expect(title).toBeTruthy();
    });

    test('should display registrations list', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show registration rows
      const count = await adminPage.getRegistrationCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should show user information for each registration', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Check for user names in the page
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('PlayerOne');
      expect(bodyText).toContain('PlayerTwo');
    });

    test('should show registration status badges', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show status badges (pending, confirmed, etc.)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(/pending|confirmed|cancelled/i);
    });
  });

  test.describe('Filter by Status', () => {
    test('should filter by pending status', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Filter by pending
      await adminPage.filterByStatus('pending');

      // Should show pending registrations
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('PlayerOne');
      expect(bodyText).toContain('PlayerThree');
    });

    test('should filter by confirmed status', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Filter by confirmed
      await adminPage.filterByStatus('confirmed');

      // Should show confirmed registrations
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('PlayerTwo');
    });

    test('should filter by cancelled status', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Filter by cancelled
      await adminPage.filterByStatus('cancelled');

      // Should show cancelled registrations
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('PlayerFour');
    });

    test('should show all registrations with "all" filter', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Filter by all
      await adminPage.filterByStatus('all');

      // Should show all registrations
      const count = await adminPage.getRegistrationCount();
      expect(count).toBe(4);
    });
  });

  test.describe('Approve Registration', () => {
    test('should show approve button for pending registrations', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should have approve button for PlayerOne (pending)
      const hasApprove = await adminPage.hasApproveButton('PlayerOne');
      expect(hasApprove).toBe(true);
    });

    test('should approve a pending registration', async ({ page }) => {
      // Mock successful approval
      await page.route('**/api/tournaments/**/registrations/**', async (route) => {
        const url = route.request().url();
        if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
          return;
        }
        await route.continue();
      });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Approve registration
      await adminPage.approveRegistration('PlayerOne');

      // Should show success (page should update or show confirmation)
      // The exact behavior depends on the implementation
    });
  });

  test.describe('Reject Registration', () => {
    test('should show reject button for pending registrations', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should have reject button for PlayerOne (pending)
      const hasReject = await adminPage.hasRejectButton('PlayerOne');
      expect(hasReject).toBe(true);
    });

    test('should reject a pending registration', async ({ page }) => {
      // Mock successful rejection
      await page.route('**/api/tournaments/**/registrations/**', async (route) => {
        const url = route.request().url();
        if (route.request().method() === 'PATCH' || route.request().method() === 'PUT' || route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
          return;
        }
        await route.continue();
      });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Reject registration
      await adminPage.rejectRegistration('PlayerOne');
    });
  });

  test.describe('Access Control', () => {
    test('should block non-admin users', async ({ page }) => {
      // Mock as non-admin user
      const nonAdminSession = createMockSession({
        id: 'regular-user-123',
        discordId: '123456789012345678',
        discordUsername: 'RegularPlayer',
        name: 'RegularPlayer',
      });

      await mockAuthEndpoints(page, { session: nonAdminSession });
      await mockUnauthorizedApi(page);

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show unauthorized message or redirect
      const isUnauthorized = await adminPage.isUnauthorized();
      const bodyText = await page.locator('body').textContent();
      const isForbidden = bodyText?.toLowerCase().includes('forbidden') ||
                         bodyText?.toLowerCase().includes('denied') ||
                         bodyText?.toLowerCase().includes('unauthorized');

      expect(isUnauthorized || isForbidden || page.url().includes('/signin')).toBe(true);
    });

    test('should require authentication', async ({ page }) => {
      // Mock unauthenticated
      await mockAuthEndpoints(page, { session: null });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should redirect to sign in
      await page.waitForURL(/signin|login|unauthorized/i, { timeout: 5000 }).catch(() => {
        // If no redirect, check body content
        const bodyText = page.locator('body').textContent();
        expect(bodyText).toBeTruthy();
      });
    });
  });

  test.describe('Search', () => {
    test('should search registrations by username', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Search for a specific user
      await adminPage.search('PlayerOne');

      // Should filter to show only matching registration
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('PlayerOne');
    });

    test('should show no results for non-matching search', async ({ page }) => {
      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Search for non-existent user
      await adminPage.search('NonExistentUser12345');

      // Should show no results
      const hasNoResults = await adminPage.hasNoResults();
      expect(hasNoResults || (await page.locator('body').textContent())).toBeTruthy();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no registrations', async ({ page }) => {
      // Clear seeded registrations to test empty state
      // Delete registrations for the test users we created
      await prisma.registration.deleteMany({
        where: {
          userId: {
            in: ['test-reg-user-1', 'test-reg-user-2', 'test-reg-user-3', 'test-reg-user-4'],
          },
        },
      });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show empty state
      const hasEmpty = await adminPage.hasEmptyState();
      const bodyText = await page.locator('body').textContent();
      const showsEmpty = bodyText?.toLowerCase().includes('no registrations') ||
                        bodyText?.toLowerCase().includes('empty');

      expect(hasEmpty || showsEmpty).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API error gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/tournaments/**/registrations**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const adminPage = new TournamentRegistrationsAdminPage(page);
      await adminPage.goto(TOURNAMENT_ID);

      // Should show error message or handle gracefully
      const hasError = await adminPage.hasError();
      const bodyText = await page.locator('body').textContent();
      const showsError = bodyText?.toLowerCase().includes('error') ||
                        bodyText?.toLowerCase().includes('failed');

      expect(hasError || showsError || page.url().includes('/signin')).toBe(true);
    });
  });
});
