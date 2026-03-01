/**
 * Tournament List Page Object Model for E2E tests.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TournamentListPage extends BasePage {
  // Page path
  readonly path = '/tournaments';

  // Main locators
  readonly pageTitle: Locator;
  readonly tournamentCards: Locator;
  readonly createTournamentButton: Locator;
  readonly emptyState: Locator;
  readonly searchInput: Locator;
  readonly filterDropdown: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    super(page, baseURL);
    this.pageTitle = this.locator('h1, [data-testid="page-title"]');
    this.tournamentCards = this.locator('[data-testid="tournament-card"], [class*="tournament"]');
    this.createTournamentButton = this.locator('[data-testid="create-tournament"], button:has-text("Create"), a:has-text("Create")');
    this.emptyState = this.locator('[data-testid="empty-state"], [class*="empty"]');
    this.searchInput = this.locator('[data-testid="search-input"], input[type="search"], input[placeholder*="search" i]');
    this.filterDropdown = this.locator('[data-testid="filter-dropdown"], select, [data-testid="filter"]');
    this.loadingSpinner = this.locator('[data-testid="loading"], [class*="spinner"], [class*="loading"]');
    this.errorMessage = this.locator('[data-testid="error-message"], [class*="error"]');
  }

  /**
   * Navigate to the tournaments page.
   */
  async goto(): Promise<void> {
    await super.goto(this.path);
    await this.waitForLoad();
  }

  /**
   * Get a tournament card by name.
   */
  getTournamentCard(name: string): Locator {
    return this.locator(`[data-testid="tournament-card"]:has-text("${name}"), [class*="tournament"]:has-text("${name}")`);
  }

  /**
   * Click the create tournament button.
   */
  async clickCreateTournament(): Promise<void> {
    await this.createTournamentButton.click();
  }

  /**
   * Get the number of displayed tournaments.
   */
  async getTournamentCount(): Promise<number> {
    return await this.tournamentCards.count();
  }

  /**
   * Check if the empty state is displayed.
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false);
  }

  /**
   * Search for tournaments.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Filter tournaments by status.
   */
  async filterByStatus(status: 'all' | 'upcoming' | 'ongoing' | 'completed'): Promise<void> {
    await this.filterDropdown.selectOption(status);
  }

  /**
   * Check if the page is loading.
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible().catch(() => false);
  }

  /**
   * Check if there's an error message displayed.
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  /**
   * Get the page title text.
   */
  async getTitle(): Promise<string> {
    return await this.pageTitle.textContent() ?? '';
  }
}
