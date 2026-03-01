---
phase: 08-e2e-page-tests
plan: 05
subsystem: E2E Testing
tags:
  - e2e
  - playwright
  - page-object-model
  - testing
  - account-settings
dependency_graph:
  requires:
    - phase: 08-01 (POM infrastructure)
      provides: BasePage class, fixtures, mockData utilities
    - phase: 08-02 (Dashboard/Tournament list tests)
      provides: Test patterns and structure
    - phase: 08-03 (Tournament detail/Registrations admin tests)
      provides: Admin page test patterns
    - phase: 08-04 (Matches admin/Audit log tests)
      provides: Additional test patterns
  provides:
    - AccountSettingsPage class
    - Account settings E2E tests (E2E-07)
  affects:
    - apps/web/__tests__/e2e/pages/AccountSettingsPage.ts
    - apps/web/__tests__/e2e/account.spec.ts
tech_stack:
  added:
    - AccountSettingsPage POM class
    - account.spec.ts with 17 test cases
  patterns:
    - Page Object Model with semantic locators
    - Role-based test fixtures
    - API endpoint mocking with Playwright route
    - Mock session for authenticated tests
key_files:
  created:
    - apps/web/__tests__/e2e/pages/AccountSettingsPage.ts
    - apps/web/__tests__/e2e/account.spec.ts
  modified: []
decisions:
  - "Used AccountSettingsPage POM following established pattern"
  - "Created 17 test cases covering profile, linked accounts, preferences, access control"
  - "Used semantic locators for accessibility"
  - "Used setupAuthenticatedState for consistent authentication"
requirements_completed:
  - E2E-07
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-01"
---

# Phase 08 Plan 05: Account Settings E2E Tests Summary

## Overview

Created AccountSettingsPage class and comprehensive E2E tests for account settings page. Tests cover user profile display, linked accounts management, notification preferences, and access control. This completes requirement E2E-07 for account settings page testing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AccountSettingsPage class | a45936e | AccountSettingsPage.ts |
| 2 | Create account.spec.ts | 83fd1ef | account.spec.ts |

## What Was Built

### AccountSettingsPage Class

**Locators:**
- Profile section: profileSection, profileHeading, discordUsername, discordAvatar, userId
- Linked accounts: linkedAccountsSection, discordConnectedBadge, discordConnectButton, discordDisconnectButton
- Start.gg: startggSection, startggUsername, startggLinkedBadge, startggConnectButton, startggDisconnectButton
- Notifications: notificationPreferencesSection, emailNotificationsToggle, matchNotificationsToggle, tournamentNotificationsToggle
- Danger zone: dangerZoneSection, dangerZoneHeading, deleteAccountButton, deleteAccountConfirmModal
- States: loadingSpinner, errorMessage, successMessage

**Methods:**
- Navigation: goto()
- Profile: hasProfileSection(), getDiscordUsername()
- Discord: isDiscordConnected(), hasConnectDiscordButton(), clickConnectDiscord(), clickDisconnectDiscord()
- Start.gg: getStartggUsername(), isStartggLinked(), hasConnectStartggButton(), hasDisconnectStartggButton(), clickConnectStartgg(), clickDisconnectStartgg()
- Notifications: hasNotificationPreferences(), hasEmailNotificationsToggle(), hasMatchNotificationsToggle(), toggleEmailNotifications(), toggleMatchNotifications()
- Danger zone: hasDangerZone(), hasDeleteAccountButton(), clickDeleteAccount(), hasDeleteConfirmModal()
- States: isLoading(), hasError(), getErrorMessage(), hasSuccess(), getSuccessMessage()

### account.spec.ts

**Test Coverage:**
- Page Loading: successful page load, accessible structure
- Profile Display: Discord username, user ID
- Linked Accounts: Discord connected state, Start.gg linked/not-linked states
- Notification Preferences: email toggle, match toggle, toggling behavior
- Danger Zone: delete account button visibility
- Access Control: unauthenticated redirect, player view
- Error Handling: API errors, network errors

## Verification

All test files created and committed:
- AccountSettingsPage.ts: Full POM class with 35+ methods
- account.spec.ts: 17 test cases covering all account settings scenarios

Tests use:
- Page Object Model class (AccountSettingsPage)
- setupAuthenticatedState for consistent auth
- Role-based fixtures (asPlayer)
- Mock API endpoints for controlled test scenarios
- Semantic locators for accessibility

Tests require running web server (localhost:3000) for execution.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] AccountSettingsPage.ts exists with POM class
- [x] account.spec.ts exists with comprehensive tests
- [x] Commit a45936e exists
- [x] Commit 83fd1ef exists
- [x] Tests use Page Object Model pattern
- [x] Tests cover requirement E2E-07
