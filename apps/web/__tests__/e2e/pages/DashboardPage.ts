/**
 * Dashboard Page Object Model for E2E tests.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Page path
  readonly path = '/dashboard';

  // Main locators
  readonly welcomeMessage: Locator;
  readonly tournamentsList: Locator;
  readonly matchesList: Locator;
  readonly recentActivity: Locator;
  readonly profileSection: Locator;
  readonly userName: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    super(page, baseURL);
    this.welcomeMessage = this.locator('[data-testid="welcome-message"], h1');
    this.tournamentsList = this.locator('[data-testid="tournaments-list"], [data-testid="tournaments"]');
    this.matchesList = this.locator('[data-testid="matches-list"], [data-testid="matches"]');
    this.recentActivity = this.locator('[data-testid="recent-activity"]');
    this.profileSection = this.locator('[data-testid="profile-section"], [data-testid="user-profile"]');
    this.userName = this.locator('[data-testid="user-name"], [data-testid="username"]');
    this.signOutButton = this.locator('[data-testid="sign-out"], button:has-text("Sign out")');
  }

  /**
   * Navigate to the dashboard page.
   */
  async goto(): Promise<void> {
    await super.goto(this.path);
    await this.waitForLoad();
  }

  /**
   * Check if the welcome message is displayed.
   */
  async hasWelcomeMessage(): Promise<boolean> {
    const message = this.welcomeMessage.first();
    return await message.isVisible().catch(() => false);
  }

  /**
   * Get all tournament cards.
   */
  getTournamentCards(): Locator {
    return this.locator('[data-testid="tournament-card"], [class*="tournament"]');
  }

  /**
   * Get all match cards.
   */
  getMatchCards(): Locator {
    return this.locator('[data-testid="match-card"], [class*="match"]');
  }

  /**
   * Get the number of displayed tournaments.
   */
  async getTournamentCount(): Promise<number> {
    return await this.getTournamentCards().count();
  }

  /**
   * Get the number of displayed matches.
   */
  async getMatchCount(): Promise<number> {
    return await this.getMatchCards().count();
  }

  /**
   * Click the sign out button.
   */
  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }

  /**
   * Check if the user is logged in (profile section is visible).
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.profileSection.isVisible().catch(() => false);
  }
}
