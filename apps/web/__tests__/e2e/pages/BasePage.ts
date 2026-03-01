/**
 * Base Page Object Model class for E2E tests.
 * Provides common navigation and element selection methods.
 */

import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;
  protected baseURL: string;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    this.page = page;
    this.baseURL = baseURL;
  }

  /**
   * Navigate to a path within the app.
   */
  async goto(path: string): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    await this.page.goto(url);
  }

  /**
   * Wait for the page to fully load.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get a locator by role (accessible name).
   */
  protected getByRole(
    name: string,
    options?: { exact?: boolean; level?: number }
  ): Locator {
    return this.page.getByRole(name, options);
  }

  /**
   * Get a locator by label (form field labels).
   */
  protected getByLabel(label: string, options?: { exact?: boolean }): Locator {
    return this.page.getByLabel(label, options);
  }

  /**
   * Get a locator by placeholder text.
   */
  protected getByPlaceholder(placeholder: string, options?: { exact?: boolean }): Locator {
    return this.page.getByPlaceholder(placeholder, options);
  }

  /**
   * Get a locator by text content.
   */
  protected getByText(text: string, options?: { exact?: boolean }): Locator {
    return this.page.getByText(text, options);
  }

  /**
   * Get a locator by test ID.
   */
  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get a locator by title attribute.
   */
  protected getByTitle(title: string, options?: { exact?: boolean }): Locator {
    return this.page.getByTitle(title, options);
  }

  /**
   * Generic locator for custom selectors.
   */
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Check if an element exists.
   */
  async isVisible(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return await element.isVisible().catch(() => false);
  }

  /**
   * Get the current URL.
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Wait for a specific URL pattern.
   */
  async waitForURL(pattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(pattern);
  }

  /**
   * Take a screenshot for debugging.
   */
  async screenshot(name?: string): Promise<Buffer | void> {
    return this.page.screenshot({ path: name });
  }
}
