/**
 * Audit Log Page Object Model for E2E tests.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuditLogPage extends BasePage {
  // Page path pattern
  readonly pathPattern = '/tournaments';

  // Main locators
  readonly pageTitle: Locator;
  readonly auditTable: Locator;
  readonly logRows: Locator;

  // Filters
  readonly actionTypeFilter: Locator;
  readonly dateFilter: Locator;
  readonly searchInput: Locator;
  readonly applyFilterButton: Locator;
  readonly clearFiltersButton: Locator;

  // Column headers
  readonly userColumn: Locator;
  readonly actionColumn: Locator;
  readonly entityColumn: Locator;
  readonly timestampColumn: Locator;
  readonly detailsColumn: Locator;

  // Pagination
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly pageIndicator: Locator;
  readonly loadMoreButton: Locator;

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
    this.auditTable = this.locator('[data-testid="audit-table"], table[class*="audit"]');
    this.logRows = this.locator('[data-testid="log-row"], tr[class*="audit"]');

    // Filters
    this.actionTypeFilter = this.locator('[data-testid="action-filter"], select[name="actionType"], select[id*="action"]');
    this.dateFilter = this.locator('[data-testid="date-filter"], input[type="date"], input[name="date"]');
    this.searchInput = this.locator('[data-testid="search-input"], input[placeholder*="search" i], input[name="search"]');
    this.applyFilterButton = this.locator('[data-testid="apply-filters"], button:has-text("Apply"), button:has-text("Filter")');
    this.clearFiltersButton = this.locator('[data-testid="clear-filters"], button:has-text("Clear"), button:has-text("Reset")');

    // Column headers
    this.userColumn = this.locator('[data-testid="user"], th:has-text("User"), th:has-text("Admin")');
    this.actionColumn = this.locator('[data-testid="action"], th:has-text("Action")');
    this.entityColumn = this.locator('[data-testid="entity"], th:has-text("Entity"), th:has-text("Target")');
    this.timestampColumn = this.locator('[data-testid="timestamp"], th:has-text("Time"), th:has-text("Date")');
    this.detailsColumn = this.locator('[data-testid="details"], th:has-text("Details")');

    // Pagination
    this.nextPageButton = this.locator('[data-testid="next-page"], button:has-text("Next"), button:has-text(">")');
    this.previousPageButton = this.locator('[data-testid="previous-page"], button:has-text("Previous"), button:has-text("<")');
    this.pageIndicator = this.locator('[data-testid="page-indicator"], [class*="page"]');
    this.loadMoreButton = this.locator('[data-testid="load-more"], button:has-text("Load More")');

    // Empty state
    this.emptyState = this.locator('[data-testid="empty-state"], [class*="empty"], text=No logs, text=No audit');
    this.noResultsMessage = this.locator('[data-testid="no-results"], text=No.*results, text=No.*logs found');

    // Loading and error states
    this.loadingSpinner = this.locator('[data-testid="loading"], [class*="spinner"], [class*="loading"]');
    this.errorMessage = this.locator('[data-testid="error-message"], [class*="error"]');

    // Access control
    this.unauthorizedMessage = this.locator('[data-testid="unauthorized"], text=Unauthorized, text=Access Denied');
  }

  /**
   * Navigate to a specific tournament's audit log page.
   */
  async goto(tournamentId: string): Promise<void> {
    await super.goto(`${this.pathPattern}/${tournamentId}/admin/audit`);
    await this.waitForLoad();
  }

  /**
   * Get a log row by index.
   */
  getLogRow(index: number): Locator {
    return this.logRows.nth(index);
  }

  /**
   * Get the number of displayed log entries.
   */
  async getLogCount(): Promise<number> {
    return await this.logRows.count();
  }

  /**
   * Filter logs by action type.
   */
  async filterByActionType(actionType: string): Promise<void> {
    await this.actionTypeFilter.selectOption(actionType);
  }

  /**
   * Filter logs by date range.
   */
  async filterByDateRange(startDate: string, endDate: string): Promise<void> {
    await this.dateFilter.first().fill(startDate);
    await this.dateFilter.last().fill(endDate);
  }

  /**
   * Click apply filters button.
   */
  async applyFilters(): Promise<void> {
    await this.applyFilterButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear all filters.
   */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Search logs.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  /**
   * Go to next page.
   */
  async nextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForLoad();
  }

  /**
   * Go to previous page.
   */
  async previousPage(): Promise<void> {
    await this.previousPageButton.click();
    await this.waitForLoad();
  }

  /**
   * Click load more button.
   */
  async loadMore(): Promise<void> {
    await this.loadMoreButton.click();
    await this.page.waitForTimeout(500);
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
   * Get log entries as an array of objects.
   */
  async getLogEntries(): Promise<Array<{
    user: string;
    action: string;
    entity: string;
    timestamp: string;
  }>> {
    const entries: Array<{
      user: string;
      action: string;
      entity: string;
      timestamp: string;
    }> = [];

    const count = await this.getLogCount();
    for (let i = 0; i < count; i++) {
      const row = this.getLogRow(i);
      const user = await row.locator(this.userColumn).textContent() ?? '';
      const action = await row.locator(this.actionColumn).textContent() ?? '';
      const entity = await row.locator(this.entityColumn).textContent() ?? '';
      const timestamp = await row.locator(this.timestampColumn).textContent() ?? '';

      entries.push({ user, action, entity, timestamp });
    }

    return entries;
  }

  /**
   * Check if next page button is enabled.
   */
  async hasNextPage(): Promise<boolean> {
    const button = this.nextPageButton;
    const isDisabled = await button.isDisabled().catch(() => true);
    return !isDisabled;
  }

  /**
   * Check if previous page button is enabled.
   */
  async hasPreviousPage(): Promise<boolean> {
    const button = this.previousPageButton;
    const isDisabled = await button.isDisabled().catch(() => true);
    return !isDisabled;
  }

  /**
   * Get the current page indicator text.
   */
  async getPageIndicator(): Promise<string> {
    return await this.pageIndicator.textContent() ?? '';
  }

  /**
   * Check if a specific action type is in the logs.
   */
  async hasActionType(actionType: string): Promise<boolean> {
    const bodyText = await this.page.locator('body').textContent();
    return bodyText?.includes(actionType) ?? false;
  }

  /**
   * Check if a specific user is in the logs.
   */
  async hasUser(username: string): Promise<boolean> {
    const bodyText = await this.page.locator('body').textContent();
    return bodyText?.includes(username) ?? false;
  }
}
