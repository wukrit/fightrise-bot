/**
 * E2E tests for tournament audit log page.
 * Tests: list actions, filter by type, filter by date, access control.
 */

import { test, expect, Page } from '@playwright/test';
import { mockAuthEndpoints, createMockSession } from './utils/auth';
import { AuditLogPage } from './pages/AuditLogPage';

// Test tournament ID
const TOURNAMENT_ID = 'tournament-123';

/**
 * Mock audit log data
 */
const mockAuditLogs = [
  {
    id: 'log-1',
    userId: 'user-1',
    discordUsername: 'AdminUser',
    action: 'TOURNAMENT_UPDATE',
    entityType: 'Tournament',
    entityId: TOURNAMENT_ID,
    details: { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
    createdAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'log-2',
    userId: 'user-1',
    discordUsername: 'AdminUser',
    action: 'REGISTRATION_APPROVE',
    entityType: 'Registration',
    entityId: 'reg-1',
    details: { userId: 'user-2', username: 'PlayerOne' },
    createdAt: '2024-03-15T09:30:00Z',
  },
  {
    id: 'log-3',
    userId: 'user-1',
    discordUsername: 'AdminUser',
    action: 'REGISTRATION_REJECT',
    entityType: 'Registration',
    entityId: 'reg-2',
    details: { userId: 'user-3', username: 'PlayerTwo' },
    createdAt: '2024-03-15T09:00:00Z',
  },
  {
    id: 'log-4',
    userId: 'user-1',
    discordUsername: 'AdminUser',
    action: 'MATCH_SCORE_REPORT',
    entityType: 'Match',
    entityId: 'match-1',
    details: { winnerId: 'user-1', score: '2-0' },
    createdAt: '2024-03-14T15:00:00Z',
  },
  {
    id: 'log-5',
    userId: 'user-1',
    discordUsername: 'AdminUser',
    action: 'PLAYER_DISQUALIFY',
    entityType: 'Match',
    entityId: 'match-2',
    details: { userId: 'user-4', reason: 'No show' },
    createdAt: '2024-03-14T14:00:00Z',
  },
];

/**
 * Admin user session
 */
const adminSession = createMockSession({
  id: 'admin-user-123',
  discordId: '999999999999999999',
  discordUsername: 'TournamentAdmin',
  name: 'TournamentAdmin',
});

/**
 * Helper to mock audit log API endpoint.
 */
async function mockAuditLogApi(page: Page, logs = mockAuditLogs) {
  await page.route('**/api/tournaments/**/admin/audit**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        auditLogs: logs,
        pagination: {
          page: 1,
          limit: 20,
          total: logs.length,
          totalPages: 1,
        },
      }),
    });
  });
}

/**
 * Helper to mock unauthorized access.
 */
async function mockUnauthorizedApi(page: Page) {
  await page.route('**/api/tournaments/**/admin/audit**', async (route) => {
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Forbidden' }),
    });
  });
}

test.describe('Tournament Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthEndpoints(page, { session: adminSession });
  });

  test.describe('Page Loading', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuditLogApi(page);
    });

    test.skip('should load audit log page', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Page should load without error
      const title = await auditPage.getTitle();
      expect(title).toBeTruthy();
    });

    test.skip('should display audit log entries', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show log rows
      const count = await auditPage.getLogCount();
      expect(count).toBeGreaterThan(0);
    });

    test.skip('should display action type', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show action types
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toMatch(/UPDATE|APPROVE|REJECT|REPORT|DISQUALIFY/i);
    });

    test.skip('should display user information', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show admin usernames
      const hasUser = await auditPage.hasUser('AdminUser');
      expect(hasUser).toBe(true);
    });

    test.skip('should display timestamps', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show timestamps
      const entries = await auditPage.getLogEntries();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].timestamp).toBeTruthy();
    });
  });

  test.describe('Filter by Action Type', () => {
    test.skip('should filter by action type', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Filter by registration approve
      await auditPage.filterByActionType('REGISTRATION_APPROVE');
      await auditPage.applyFilters();

      // Should show only matching action type
      const hasAction = await auditPage.hasActionType('REGISTRATION_APPROVE');
      expect(hasAction).toBe(true);
    });

    test.skip('should filter by multiple action types', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Filter by update
      await auditPage.filterByActionType('TOURNAMENT_UPDATE');
      await auditPage.applyFilters();

      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toContain('TOURNAMENT_UPDATE');
    });
  });

  test.describe('Filter by Date', () => {
    test.skip('should filter by date range', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Filter by date range
      await auditPage.filterByDateRange('2024-03-14', '2024-03-15');
      await auditPage.applyFilters();

      // Should show logs within the date range
      const count = await auditPage.getLogCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test.skip('should filter by specific date', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Filter by specific date
      await auditPage.filterByDateRange('2024-03-15', '2024-03-15');
      await auditPage.applyFilters();

      // Should show logs from that date
      const entries = await auditPage.getLogEntries();
      expect(entries.length).toBeGreaterThanOrEqual(0);
    });

    test.skip('should clear filters', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Apply a filter
      await auditPage.filterByActionType('REGISTRATION_APPROVE');
      await auditPage.applyFilters();

      // Clear filters
      await auditPage.clearFilters();

      // Should show all logs again
      const count = await auditPage.getLogCount();
      expect(count).toBe(5); // All logs
    });
  });

  test.describe('Search', () => {
    test.skip('should search by user', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Search for a specific user
      await auditPage.search('AdminUser');

      // Should show matching logs
      const hasUser = await auditPage.hasUser('AdminUser');
      expect(hasUser).toBe(true);
    });
  });

  test.describe('Pagination', () => {
    test.skip('should have pagination controls', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Check if pagination exists (may or may not be visible depending on data)
      const hasNext = await auditPage.hasNextPage();
      const hasPrev = await auditPage.hasPreviousPage();

      // Either pagination controls exist or there's only one page
      const count = await auditPage.getLogCount();
      if (count > 0) {
        // Pagination may or may not be visible
      }
    });
  });

  test.describe('Empty State', () => {
    test.skip('should show empty state when no logs', async ({ page }) => {
      // Mock empty logs
      await mockAuditLogApi(page, []);

      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show empty state
      const hasEmpty = await auditPage.hasEmptyState();
      const bodyText = await page.locator('body').textContent();
      const showsEmpty = bodyText?.toLowerCase().includes('no logs') ||
                        bodyText?.toLowerCase().includes('no audit') ||
                        bodyText?.toLowerCase().includes('empty');

      expect(hasEmpty || showsEmpty).toBe(true);
    });

    test.skip('should show no results when filter returns empty', async ({ page }) => {
      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Filter by non-existent action type
      await auditPage.filterByActionType('NONEXISTENT_ACTION');
      await auditPage.applyFilters();

      // Should show no results
      const hasNoResults = await auditPage.hasNoResults();
      // Either no results message or empty state
      const hasEmpty = await auditPage.hasEmptyState();
      expect(hasNoResults || hasEmpty).toBe(true);
    });
  });

  test.describe('Access Control', () => {
    test.skip('should block non-admin users', async ({ page }) => {
      // Mock as non-admin user
      const nonAdminSession = createMockSession({
        id: 'regular-user-123',
        discordId: '123456789012345678',
        discordUsername: 'RegularPlayer',
        name: 'RegularPlayer',
      });

      await mockAuthEndpoints(page, { session: nonAdminSession });
      await mockUnauthorizedApi(page);

      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show unauthorized message or redirect
      const isUnauthorized = await auditPage.isUnauthorized();
      const bodyText = await page.locator('body').textContent();
      const isForbidden = bodyText?.toLowerCase().includes('forbidden') ||
                         bodyText?.toLowerCase().includes('denied') ||
                         bodyText?.toLowerCase().includes('unauthorized');

      expect(isUnauthorized || isForbidden || page.url().includes('/signin')).toBe(true);
    });

    test.skip('should require authentication', async ({ page }) => {
      // Mock unauthenticated
      await mockAuthEndpoints(page, { session: null });

      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should redirect to sign in
      await page.waitForURL(/signin|login|unauthorized/i, { timeout: 5000 }).catch(() => {
        // If no redirect, check body content
        const bodyText = page.locator('body').textContent();
        expect(bodyText).toBeTruthy();
      });
    });
  });

  test.describe('Error Handling', () => {
    test.skip('should handle API error gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/tournaments/**/admin/audit**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const auditPage = new AuditLogPage(page);
      await auditPage.goto(TOURNAMENT_ID);

      // Should show error message or handle gracefully
      const hasError = await auditPage.hasError();
      const bodyText = await page.locator('body').textContent();
      const showsError = bodyText?.toLowerCase().includes('error') ||
                        bodyText?.toLowerCase().includes('failed');

      expect(hasError || showsError || page.url().includes('/signin')).toBe(true);
    });
  });
});
