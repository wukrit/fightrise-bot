/**
 * Tournament Registrations Admin Page Object Model for E2E tests.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TournamentRegistrationsAdminPage extends BasePage {
  // Page path pattern
  readonly pathPattern = '/tournaments';

  // Main locators
  readonly pageTitle: Locator;
  readonly registrationTable: Locator;
  readonly registrationRows: Locator;
  readonly filterDropdown: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;

  // Registration actions
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly viewButton: Locator;

  // Status badges
  readonly statusBadge: Locator;
  readonly pendingBadge: Locator;
  readonly confirmedBadge: Locator;
  readonly cancelledBadge: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly noResultsMessage: Locator;

  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  // Access control
  readonly unauthorizedMessage: Locator;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    super(page, baseURL);

    // Main locators
    this.pageTitle = this.locator('h1, h2, [data-testid="page-title"]');
    this.registrationTable = this.locator('[data-testid="registration-table"], table[class*="registration"]');
    this.registrationRows = this.locator('[data-testid="registration-row"], tr[class*="registration"]');
    this.filterDropdown = this.locator('[data-testid="status-filter"], select[name="status"], select[id*="status"]');
    this.searchInput = this.locator('[data-testid="search-input"], input[placeholder*="search" i], input[name="search"]');
    this.refreshButton = this.locator('[data-testid="refresh-button"], button:has-text("Refresh")');

    // Registration actions
    this.approveButton = this.locator('[data-testid="approve-button"], button:has-text("Approve")');
    this.rejectButton = this.locator('[data-testid="reject-button"], button:has-text("Reject")');
    this.viewButton = this.locator('[data-testid="view-button"], button:has-text("View")');

    // Status badges
    this.statusBadge = this.locator('[data-testid="status-badge"], [class*="status"]');
    this.pendingBadge = this.locator('[class*="pending"], text=Pending');
    this.confirmedBadge = this.locator('[class*="confirmed"], text=Confirmed');
    this.cancelledBadge = this.locator('[class*="cancelled"], text=Cancelled');

    // Empty state
    this.emptyState = this.locator('[data-testid="empty-state"], [class*="empty"]');
    this.noResultsMessage = this.locator('[data-testid="no-results"], text=No.*registrations');

    // Loading and error states
    this.loadingSpinner = this.locator('[data-testid="loading"], [class*="spinner"], [class*="loading"]');
    this.errorMessage = this.locator('[data-testid="error-message"], [class*="error"]');

    // Access control
    this.unauthorizedMessage = this.locator('[data-testid="unauthorized"], text=Unauthorized, text=Access Denied');
  }

  /**
   * Navigate to a specific tournament's registrations admin page.
   */
  async goto(tournamentId: string): Promise<void> {
    await super.goto(`${this.pathPattern}/${tournamentId}/admin/registrations`);
    await this.waitForLoad();
  }

  /**
   * Get a registration row by user name.
   */
  getRegistrationRow(username: string): Locator {
    return this.locator(`[data-testid="registration-row"]:has-text("${username}"), tr:has-text("${username}")`);
  }

  /**
   * Get the number of displayed registrations.
   */
  async getRegistrationCount(): Promise<number> {
    return await this.registrationRows.count();
  }

  /**
   * Approve a registration by username.
   */
  async approveRegistration(username: string): Promise<void> {
    const row = this.getRegistrationRow(username);
    const approveBtn = row.locator(this.approveButton);
    await approveBtn.click();
  }

  /**
   * Reject a registration by username.
   */
  async rejectRegistration(username: string): Promise<void> {
    const row = this.getRegistrationRow(username);
    const rejectBtn = row.locator(this.rejectButton);
    await rejectBtn.click();
  }

  /**
   * Filter registrations by status.
   */
  async filterByStatus(status: 'all' | 'pending' | 'confirmed' | 'cancelled'): Promise<void> {
    await this.filterDropdown.selectOption(status);
  }

  /**
   * Search for registrations.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for search results
    await this.page.waitForTimeout(300);
  }

  /**
   * Click the refresh button.
   */
  async clickRefresh(): Promise<void> {
    await this.refreshButton.click();
  }

  /**
   * Check if the empty state is displayed.
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false);
  }

  /**
   * Check if no results message is displayed.
   */
  async hasNoResults(): Promise<boolean> {
    return await this.noResultsMessage.isVisible().catch(() => false);
  }

  /**
   * Check if there's an error message displayed.
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  /**
   * Check if unauthorized message is shown.
   */
  async isUnauthorized(): Promise<boolean> {
    return await this.unauthorizedMessage.isVisible().catch(() => false);
  }

  /**
   * Check if page is loading.
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible().catch(() => false);
  }

  /**
   * Get the page title text.
   */
  async getTitle(): Promise<string> {
    return await this.pageTitle.textContent() ?? '';
  }

  /**
   * Get registration status for a specific user.
   */
  async getRegistrationStatus(username: string): Promise<string> {
    const row = this.getRegistrationRow(username);
    const statusBadge = row.locator(this.statusBadge);
    return await statusBadge.textContent() ?? '';
  }

  /**
   * Check if approve button is visible for a user.
   */
  async hasApproveButton(username: string): Promise<boolean> {
    const row = this.getRegistrationRow(username);
    return await row.locator(this.approveButton).isVisible().catch(() => false);
  }

  /**
   * Check if reject button is visible for a user.
   */
  async hasRejectButton(username: string): Promise<boolean> {
    const row = this.getRegistrationRow(username);
    return await row.locator(this.rejectButton).isVisible().catch(() => false);
  }
}
