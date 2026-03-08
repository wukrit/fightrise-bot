/**
 * Tournament Detail Page Object Model for E2E tests.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TournamentDetailPage extends BasePage {
  // Page path pattern
  readonly pathPattern = '/tournaments';

  // Main locators - Tournament Info
  readonly tournamentName: Locator;
  readonly tournamentSlug: Locator;
  readonly tournamentStatus: Locator;
  readonly venueInfo: Locator;
  readonly scheduleInfo: Locator;
  readonly bracketLink: Locator;

  // Registration locators
  readonly registerButton: Locator;
  readonly unregisterButton: Locator;
  readonly registrationStatus: Locator;

  // Events section
  readonly eventsSection: Locator;
  readonly eventCards: Locator;

  // Loading and error states
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly notFoundMessage: Locator;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    super(page, baseURL);

    // Tournament Info locators
    this.tournamentName = this.locator('h1, [data-testid="tournament-name"]');
    this.tournamentSlug = this.locator('[data-testid="tournament-slug"], [class*="slug"]');
    this.tournamentStatus = this.locator('[data-testid="tournament-status"], [class*="status"]');
    this.venueInfo = this.locator('[data-testid="venue-info"], [class*="venue"]');
    this.scheduleInfo = this.locator('[data-testid="schedule-info"], [class*="schedule"]');
    this.bracketLink = this.locator('[data-testid="bracket-link"], a[href*="bracket"]');

    // Registration locators
    this.registerButton = this.locator('[data-testid="register-button"], button:has-text("Register")');
    this.unregisterButton = this.locator('[data-testid="unregister-button"], button:has-text("Unregister")');
    this.registrationStatus = this.locator('[data-testid="registration-status"], [class*="registration"]');

    // Events section
    this.eventsSection = this.locator('[data-testid="events-section"], [class*="events"]');
    this.eventCards = this.locator('[data-testid="event-card"], [class*="event"]');

    // Loading and error states
    this.loadingSpinner = this.locator('[data-testid="loading"], [class*="spinner"], [class*="loading"]');
    this.errorMessage = this.locator('[data-testid="error-message"], [class*="error"]');
    this.notFoundMessage = this.locator('[data-testid="not-found"], [class*="404"], text=Not Found');
  }

  /**
   * Navigate to a specific tournament's detail page.
   */
  async goto(tournamentId: string): Promise<void> {
    await super.goto(`${this.pathPattern}/${tournamentId}`);
    await this.waitForLoad();
  }

  /**
   * Get the tournament name text.
   */
  async getTournamentName(): Promise<string> {
    try {
      if (await this.tournamentName.isVisible()) {
        return await this.tournamentName.textContent() ?? '';
      }
    } catch {}
    return '';
  }

  /**
   * Check if tournament name is visible.
   */
  async hasTournamentName(): Promise<boolean> {
    return await this.tournamentName.isVisible().catch(() => false);
  }

  /**
   * Get tournament status text.
   */
  async getTournamentStatus(): Promise<string> {
    try {
      if (await this.tournamentStatus.isVisible()) {
        return await this.tournamentStatus.textContent() ?? '';
      }
    } catch {}
    return '';
  }

  /**
   * Check if registration is open.
   */
  async isRegistrationOpen(): Promise<boolean> {
    const text = await this.getTournamentStatus();
    if (!text) return false;
    return /registration\s*open/i.test(text);
  }

  /**
   * Click the register button.
   */
  async clickRegister(): Promise<void> {
    await this.registerButton.click();
  }

  /**
   * Click the unregister button.
   */
  async clickUnregister(): Promise<void> {
    await this.unregisterButton.click();
  }

  /**
   * Check if register button is visible.
   */
  async hasRegisterButton(): Promise<boolean> {
    return await this.registerButton.isVisible().catch(() => false);
  }

  /**
   * Check if unregister button is visible.
   */
  async hasUnregisterButton(): Promise<boolean> {
    return await this.unregisterButton.isVisible().catch(() => false);
  }

  /**
   * Get all event cards.
   */
  getEventCard(name: string): Locator {
    return this.locator(`[data-testid="event-card"]:has-text("${name}"), [class*="event"]:has-text("${name}")`);
  }

  /**
   * Get the number of displayed events.
   */
  async getEventCount(): Promise<number> {
    return await this.eventCards.count();
  }

  /**
   * Check if events section is visible.
   */
  async hasEvents(): Promise<boolean> {
    return await this.eventsSection.isVisible().catch(() => false);
  }

  /**
   * Get venue information.
   */
  async getVenueInfo(): Promise<string> {
    return await this.venueInfo.textContent() ?? '';
  }

  /**
   * Get schedule information.
   */
  async getScheduleInfo(): Promise<string> {
    return await this.scheduleInfo.textContent() ?? '';
  }

  /**
   * Check if the page shows a 404 error.
   */
  async isNotFound(): Promise<boolean> {
    return await this.notFoundMessage.isVisible().catch(() => false);
  }

  /**
   * Check if there's an error message displayed.
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  /**
   * Check if page is loading.
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible().catch(() => false);
  }

  /**
   * Click the bracket link to view bracket.
   */
  async clickBracketLink(): Promise<void> {
    await this.bracketLink.click();
  }
}
