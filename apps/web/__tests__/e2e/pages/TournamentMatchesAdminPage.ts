/**
 * Tournament Matches Admin Page Object Model for E2E tests.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TournamentMatchesAdminPage extends BasePage {
  // Page path pattern
  readonly pathPattern = '/tournaments';

  // Main locators
  readonly pageTitle: Locator;
  readonly matchesTable: Locator;
  readonly matchRows: Locator;
  readonly roundDropdown: Locator;

  // Column locators
  readonly player1Column: Locator;
  readonly player2Column: Locator;
  readonly scoreColumn: Locator;
  readonly statusColumn: Locator;

  // Action buttons
  readonly viewDetailsButton: Locator;
  readonly reportScoreButton: Locator;
  readonly dqButton: Locator;

  // Round indicators
  readonly roundHeaders: Locator;

  // Empty state
  readonly emptyState: Locator;

  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  // Access control
  readonly unauthorizedMessage: Locator;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    super(page, baseURL);

    // Main locators
    this.pageTitle = this.locator('h1, h2, [data-testid="page-title"]');
    this.matchesTable = this.locator('[data-testid="matches-table"], table[class*="match"]');
    this.matchRows = this.locator('[data-testid="match-row"], tr[class*="match"]');
    this.roundDropdown = this.locator('[data-testid="round-filter"], select[name="round"], select[id*="round"]');

    // Column locators
    this.player1Column = this.locator('[data-testid="player1"], [class*="player1"], th:has-text("Player 1"), td:nth-child(1)');
    this.player2Column = this.locator('[data-testid="player2"], [class*="player2"], th:has-text("Player 2"), td:nth-child(2)');
    this.scoreColumn = this.locator('[data-testid="score"], [class*="score"], th:has-text("Score"), td:nth-child(3)');
    this.statusColumn = this.locator('[data-testid="status"], [class*="status"], th:has-text("Status"), td:nth-child(4)');

    // Action buttons
    this.viewDetailsButton = this.locator('[data-testid="view-details"], button:has-text("View"), button:has-text("Details")');
    this.reportScoreButton = this.locator('[data-testid="report-score"], button:has-text("Report"), button:has-text("Score")');
    this.dqButton = this.locator('[data-testid="dq-button"], button:has-text("DQ"), button:has-text("Disqualify")');

    // Round indicators
    this.roundHeaders = this.locator('[data-testid="round-header"], [class*="round-header"], h3:has-text("Round"), h4:has-text("Round")');

    // Empty state
    this.emptyState = this.locator('[data-testid="empty-state"], [class*="empty"], text=No matches');

    // Loading and error states
    this.loadingSpinner = this.locator('[data-testid="loading"], [class*="spinner"], [class*="loading"]');
    this.errorMessage = this.locator('[data-testid="error-message"], [class*="error"]');

    // Access control
    this.unauthorizedMessage = this.locator('[data-testid="unauthorized"], text=Unauthorized, text=Access Denied');
  }

  /**
   * Navigate to a specific tournament's matches admin page.
   */
  async goto(tournamentId: string): Promise<void> {
    await super.goto(`${this.pathPattern}/${tournamentId}/admin/matches`);
    await this.waitForLoad();
  }

  /**
   * Get a match row by round and position (0-indexed within the round).
   */
  getMatchRow(round: number, position: number): Locator {
    return this.locator(`[data-testid="match-row"]:nth-child(${position + 1})`);
  }

  /**
   * Get a match row by player name.
   */
  getMatchRowByPlayer(playerName: string): Locator {
    return this.locator(`[data-testid="match-row"]:has-text("${playerName}")`);
  }

  /**
   * Get the number of displayed matches.
   */
  async getMatchCount(): Promise<number> {
    return await this.matchRows.count();
  }

  /**
   * Click view details button for a specific match.
   */
  async clickViewMatch(matchId: string): Promise<void> {
    const row = this.getMatchRowByPlayer(matchId);
    await row.locator(this.viewDetailsButton).click();
  }

  /**
   * Click report score button for a specific match.
   */
  async clickReportScore(matchId: string): Promise<void> {
    const row = this.getMatchRowByPlayer(matchId);
    await row.locator(this.reportScoreButton).click();
  }

  /**
   * Click DQ button for a specific player.
   */
  async clickDqPlayer(playerName: string): Promise<void> {
    const row = this.getMatchRowByPlayer(playerName);
    await row.locator(this.dqButton).click();
  }

  /**
   * Filter matches by round.
   */
  async filterByRound(round: string): Promise<void> {
    await this.roundDropdown.selectOption(round);
  }

  /**
   * Check if the empty state is displayed.
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false);
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
   * Get match status for a specific player.
   */
  async getMatchStatus(playerName: string): Promise<string> {
    const row = this.getMatchRowByPlayer(playerName);
    const statusCell = row.locator(this.statusColumn);
    return await statusCell.textContent() ?? '';
  }

  /**
   * Check if report score button is visible for a match.
   */
  async hasReportScoreButton(playerName: string): Promise<boolean> {
    const row = this.getMatchRowByPlayer(playerName);
    return await row.locator(this.reportScoreButton).isVisible().catch(() => false);
  }

  /**
   * Check if DQ button is visible for a player.
   */
  async hasDqButton(playerName: string): Promise<boolean> {
    const row = this.getMatchRowByPlayer(playerName);
    return await row.locator(this.dqButton).isVisible().catch(() => false);
  }

  /**
   * Get the number of rounds displayed.
   */
  async getRoundCount(): Promise<number> {
    return await this.roundHeaders.count();
  }

  /**
   * Check if a player is displayed in the matches.
   */
  async hasPlayer(playerName: string): Promise<boolean> {
    const bodyText = await this.page.locator('body').textContent();
    return bodyText?.includes(playerName) ?? false;
  }

  /**
   * Get match score for a specific player.
   */
  async getMatchScore(playerName: string): Promise<string> {
    const row = this.getMatchRowByPlayer(playerName);
    const scoreCell = row.locator(this.scoreColumn);
    return await scoreCell.textContent() ?? '';
  }
}
