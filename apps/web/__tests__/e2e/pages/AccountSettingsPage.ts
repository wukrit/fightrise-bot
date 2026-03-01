/**
 * Page Object Model for Account Settings page.
 * Tests user profile, linked accounts, and notification preferences.
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AccountSettingsPage extends BasePage {
  // Profile section locators
  readonly profileSection: Locator;
  readonly profileHeading: Locator;
  readonly discordUsername: Locator;
  readonly discordAvatar: Locator;
  readonly userId: Locator;

  // Linked accounts section locators
  readonly linkedAccountsSection: Locator;
  readonly linkedAccountsHeading: Locator;
  readonly discordConnectedBadge: Locator;
  readonly discordConnectButton: Locator;
  readonly discordDisconnectButton: Locator;
  readonly startggSection: Locator;
  readonly startggUsername: Locator;
  readonly startggLinkedBadge: Locator;
  readonly startggConnectButton: Locator;
  readonly startggDisconnectButton: Locator;

  // Notification preferences section locators
  readonly notificationPreferencesSection: Locator;
  readonly notificationPreferencesHeading: Locator;
  readonly emailNotificationsToggle: Locator;
  readonly matchNotificationsToggle: Locator;
  readonly tournamentNotificationsToggle: Locator;

  // Danger zone section locators
  readonly dangerZoneSection: Locator;
  readonly dangerZoneHeading: Locator;
  readonly deleteAccountButton: Locator;
  readonly deleteAccountConfirmModal: Locator;

  // States
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page, baseURL = 'http://localhost:3000') {
    super(page, baseURL);

    // Profile section
    this.profileSection = this.locator('[data-testid="profile-section"], section:has-text("Profile")');
    this.profileHeading = this.locator('h1:has-text("Account Settings"), h2:has-text("Profile")');
    this.discordUsername = this.locator('[data-testid="discord-username"], [class*="discord"]:has-text("@")');
    this.discordAvatar = this.locator('[data-testid="discord-avatar"], img[alt*="avatar"]');
    this.userId = this.locator('[data-testid="user-id"], [class*="user-id"]');

    // Linked accounts section
    this.linkedAccountsSection = this.locator('[data-testid="linked-accounts"], section:has-text("Linked Accounts")');
    this.linkedAccountsHeading = this.locator('h2:has-text("Linked Accounts")');
    this.discordConnectedBadge = this.locator('[data-testid="discord-connected"], [class*="discord"]:has-text("Connected")');
    this.discordConnectButton = this.locator('button:has-text("Connect Discord"), button:has-text("Link Discord")');
    this.discordDisconnectButton = this.locator('button:has-text("Disconnect Discord"), button:has-text("Unlink Discord")');

    // Start.gg section
    this.startggSection = this.locator('[data-testid="startgg-section"], section:has-text("Start.gg")');
    this.startggUsername = this.locator('[data-testid="startgg-username"], [class*="startgg"]:has-text("@")');
    this.startggLinkedBadge = this.locator('[data-testid="startgg-connected"], [class*="startgg"]:has-text("Connected")');
    this.startggConnectButton = this.locator('button:has-text("Connect Start.gg"), button:has-text("Link Start.gg")');
    this.startggDisconnectButton = this.locator('button:has-text("Disconnect Start.gg"), button:has-text("Unlink Start.gg")');

    // Notification preferences section
    this.notificationPreferencesSection = this.locator('[data-testid="notifications"], section:has-text("Notification")');
    this.notificationPreferencesHeading = this.locator('h2:has-text("Notification Preferences")');
    this.emailNotificationsToggle = this.locator('[data-testid="email-notifications"], label:has-text("Email")');
    this.matchNotificationsToggle = this.locator('[data-testid="match-notifications"], label:has-text("Match")');
    this.tournamentNotificationsToggle = this.locator('[data-testid="tournament-notifications"], label:has-text("Tournament")');

    // Danger zone section
    this.dangerZoneSection = this.locator('[data-testid="danger-zone"], section:has-text("Danger Zone")');
    this.dangerZoneHeading = this.locator('h2:has-text("Danger Zone")');
    this.deleteAccountButton = this.locator('button:has-text("Delete Account"), button:has-text("Delete Your Account")');
    this.deleteAccountConfirmModal = this.locator('[role="dialog"]:has-text("Delete Account"), [class*="modal"]:has-text("Delete")');

    // States
    this.loadingSpinner = this.locator('[data-testid="loading"], [class*="spinner"], .loading');
    this.errorMessage = this.locator('[data-testid="error"], [class*="error"], text="Error"');
    this.successMessage = this.locator('[data-testid="success"], [class*="success"], text="Success"');
  }

  /**
   * Navigate to account settings page.
   */
  async goto(): Promise<void> {
    await this.goto('/account');
    await this.waitForLoad();
  }

  /**
   * Check if page has loaded with profile heading.
   */
  async hasProfileSection(): Promise<boolean> {
    return await this.profileSection.isVisible().catch(() => false);
  }

  /**
   * Get Discord username text.
   */
  async getDiscordUsername(): Promise<string | null> {
    if (await this.discordUsername.isVisible().catch(() => false)) {
      return await this.discordUsername.textContent();
    }
    return null;
  }

  /**
   * Check if Discord account is connected.
   */
  async isDiscordConnected(): Promise<boolean> {
    return await this.discordConnectedBadge.isVisible().catch(() => false);
  }

  /**
   * Check if Connect Discord button is visible (not connected).
   */
  async hasConnectDiscordButton(): Promise<boolean> {
    return await this.discordConnectButton.isVisible().catch(() => false);
  }

  /**
   * Click Connect Discord button.
   */
  async clickConnectDiscord(): Promise<void> {
    await this.discordConnectButton.click();
  }

  /**
   * Click Disconnect Discord button.
   */
  async clickDisconnectDiscord(): Promise<void> {
    await this.discordDisconnectButton.click();
  }

  /**
   * Get Start.gg username text.
   */
  async getStartggUsername(): Promise<string | null> {
    if (await this.startggUsername.isVisible().catch(() => false)) {
      return await this.startggUsername.textContent();
    }
    return null;
  }

  /**
   * Check if Start.gg account is linked.
   */
  async isStartggLinked(): Promise<boolean> {
    return await this.startggLinkedBadge.isVisible().catch(() => false);
  }

  /**
   * Check if Connect Start.gg button is visible (not linked).
   */
  async hasConnectStartggButton(): Promise<boolean> {
    return await this.startggConnectButton.isVisible().catch(() => false);
  }

  /**
   * Check if Disconnect Start.gg button is visible (linked).
   */
  async hasDisconnectStartggButton(): Promise<boolean> {
    return await this.startggDisconnectButton.isVisible().catch(() => false);
  }

  /**
   * Click Connect Start.gg button.
   */
  async clickConnectStartgg(): Promise<void> {
    await this.startggConnectButton.click();
  }

  /**
   * Click Disconnect Start.gg button.
   */
  async clickDisconnectStartgg(): Promise<void> {
    await this.startggDisconnectButton.click();
  }

  /**
   * Check if notification preferences section is visible.
   */
  async hasNotificationPreferences(): Promise<boolean> {
    return await this.notificationPreferencesSection.isVisible().catch(() => false);
  }

  /**
   * Check if email notifications toggle exists.
   */
  async hasEmailNotificationsToggle(): Promise<boolean> {
    return await this.emailNotificationsToggle.isVisible().catch(() => false);
  }

  /**
   * Check if match notifications toggle exists.
   */
  async hasMatchNotificationsToggle(): Promise<boolean> {
    return await this.matchNotificationsToggle.isVisible().catch(() => false);
  }

  /**
   * Check if tournament notifications toggle exists.
   */
  async hasTournamentNotificationsToggle(): Promise<boolean> {
    return await this.tournamentNotificationsToggle.isVisible().catch(() => false);
  }

  /**
   * Click email notifications toggle.
   */
  async toggleEmailNotifications(): Promise<void> {
    await this.emailNotificationsToggle.click();
  }

  /**
   * Click match notifications toggle.
   */
  async toggleMatchNotifications(): Promise<void> {
    await this.matchNotificationsToggle.click();
  }

  /**
   * Click tournament notifications toggle.
   */
  async toggleTournamentNotifications(): Promise<void> {
    await this.tournamentNotificationsToggle.click();
  }

  /**
   * Check if danger zone section is visible.
   */
  async hasDangerZone(): Promise<boolean> {
    return await this.dangerZoneSection.isVisible().catch(() => false);
  }

  /**
   * Check if delete account button is visible.
   */
  async hasDeleteAccountButton(): Promise<boolean> {
    return await this.deleteAccountButton.isVisible().catch(() => false);
  }

  /**
   * Click delete account button.
   */
  async clickDeleteAccount(): Promise<void> {
    await this.deleteAccountButton.click();
  }

  /**
   * Check if delete account confirmation modal is visible.
   */
  async hasDeleteConfirmModal(): Promise<boolean> {
    return await this.deleteAccountConfirmModal.isVisible().catch(() => false);
  }

  /**
   * Check for loading state.
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible().catch(() => false);
  }

  /**
   * Check for error message.
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  /**
   * Get error message text.
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check for success message.
   */
  async hasSuccess(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }

  /**
   * Get success message text.
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.hasSuccess()) {
      return await this.successMessage.textContent();
    }
    return null;
  }
}
