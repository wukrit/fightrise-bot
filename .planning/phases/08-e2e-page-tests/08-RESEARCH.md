# Phase 8: E2E Page Tests - Research

**Researched:** 2026-02-27
**Domain:** Browser automation testing with Playwright
**Confidence:** HIGH

## Summary

This phase implements E2E browser automation tests for 7 web portal pages using Playwright. The project already has a solid foundation: Playwright v1.58 configured, NextAuth mocking utilities built, and 4 existing test files (auth, dashboard, tournaments, matches). The main work involves expanding test coverage to all required pages using the Page Object Model pattern and implementing proper test data isolation.

**Primary recommendation:** Extend existing Playwright infrastructure with Page Object Model classes and factory functions for test data. Follow the existing auth mocking pattern already proven in the codebase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Auth handling**: Use NextAuth mock/override to bypass real auth - faster, more isolated
- **Shared session per test file**: Sign in once in beforeAll, reuse for all tests
- **Tests must verify different user roles**: Admin vs player
- **Fail fast if auth setup fails**

### Test Structure

- **Page Object Model**: Create Page classes with methods - selectors + actions encapsulated
- **Page objects contain only locators + helper methods**, not assertions (tests own assertions)
- **Pages share common base class** for navigation and layout
- **Page object files** located in tests/e2e/pages/ alongside tests
- **Naming convention**: PascalCase (DashboardPage, TournamentListPage)
- **Method chaining** for multi-step flows: page.gotoTournaments().createTournament()
- **Selector strategy**: Semantic locators (getByRole, getByLabel) - accessible, stable
- **Rely on Playwright's auto-wait** for elements, not explicit waits

### Test Data

- **Factory functions** that create data on-demand in each test
- **Clean up created data** after each test - clean state
- **Use database transaction rollback** for test data isolation
- **Create full realistic data hierarchy** (orgs, events, brackets, players), not minimal

### Coverage Approach

- **Multiple tests per page**: Page loads, interactions, edge cases, error states
- **Standard coverage**: Page renders + elements + interactions work + data displays + navigation works
- **Test on Chromium only** for speed
- **Run tests in parallel** for faster execution

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| E2E-01 | E2E tests for dashboard page (user overview) | Existing dashboard.spec.ts provides foundation; needs expanded coverage |
| E2E-02 | E2E tests for tournaments list page | Existing tournaments.spec.ts covers detail page; list page needs coverage |
| E2E-03 | E2E tests for tournament detail page | Existing tournaments.spec.ts provides API mocking patterns |
| E2E-04 | E2E tests for tournament registrations admin page | New page - requires new test file with admin role mocking |
| E2E-05 | E2E tests for tournament matches admin page | New page - requires new test file with admin role mocking |
| E2E-06 | E2E tests for admin audit log page | New page - requires new test file with admin role mocking |
| E2E-07 | E2E tests for account settings page | New page - requires new test file with user settings mocking |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | ^1.58.0 | E2E browser testing framework | Industry standard, auto-wait, cross-browser |
| `playwright-msw` | ^3.0.1 | MSW + Playwright integration | Already installed for API mocking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jose` | (existing) | JWT token generation for auth mocking | Already used in utils/auth.ts |
| `@playwright/test` fixtures | - | Worker-scoped auth, custom fixtures | For role-based testing |

**Installation:**
No new packages required - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure

```
apps/web/__tests__/
├── e2e/
│   ├── pages/                    # NEW: Page Object Models
│   │   ├── BasePage.ts          # Common navigation/layout methods
│   │   ├── DashboardPage.ts
│   │   ├── TournamentListPage.ts
│   │   ├── TournamentDetailPage.ts
│   │   ├── TournamentRegistrationsAdminPage.ts
│   │   ├── TournamentMatchesAdminPage.ts
│   │   ├── AuditLogPage.ts
│   │   └── AccountSettingsPage.ts
│   ├── utils/
│   │   ├── auth.ts              # EXISTING: Auth utilities
│   │   └── mockData.ts          # NEW: Factory functions for test data
│   ├── auth.spec.ts             # EXISTING
│   ├── dashboard.spec.ts        # EXISTING
│   ├── tournaments.spec.ts      # EXISTING
│   ├── matches.spec.ts          # EXISTING
│   ├── registrations-admin.spec.ts  # NEW
│   ├── matches-admin.spec.ts    # NEW
│   ├── audit-log.spec.ts        # NEW
│   └── account.spec.ts          # NEW
```

### Pattern 1: Page Object Model with Base Class

From Playwright best practices, pages should encapsulate selectors and actions:

```typescript
// apps/web/__tests__/e2e/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(public readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  protected getByRole(name: string, options?: any): Locator {
    return this.page.getByRole(name, options);
  }
}
```

```typescript
// apps/web/__tests__/e2e/pages/DashboardPage.ts
import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class DashboardPage extends BasePage {
  readonly welcomeMessage = this.page.locator('h1:has-text("Welcome")');
  readonly tournamentsList = this.page.locator('[data-testid="tournaments"]');
  readonly matchesList = this.page.locator('[data-testid="matches"]');

  async goto(): Promise<void> {
    await super.goto('/dashboard');
    await super.waitForLoad();
  }

  async hasWelcomeMessage(): Promise<boolean> {
    return this.welcomeMessage.isVisible();
  }
}
```

### Pattern 2: Role-Based Auth Fixtures

Extend Playwright test for different user roles:

```typescript
// apps/web/__tests__/e2e/utils/fixtures.ts
import { test as base, Page } from '@playwright/test';
import { setupAuthenticatedState, MockSession, createMockSession } from './utils/auth';

type AdminSession = MockSession & { user: { role: 'admin' } };

export const test = base.extend<{
  asAdmin: (overrides?: Partial<MockSession['user']>) => Promise<void>;
  asPlayer: (overrides?: Partial<MockSession['user']>) => Promise<void>;
}>({
  asAdmin: async ({ page }, use) => {
    const adminSession = createMockSession({
      discordId: 'admin-discord-id',
      discordUsername: 'AdminUser',
    });
    await setupAuthenticatedState(page, adminSession);
    await use();
  },
  asPlayer: async ({ page }, use) => {
    const playerSession = createMockSession({
      discordId: 'player-discord-id',
      discordUsername: 'PlayerUser',
    });
    await setupAuthenticatedState(page, playerSession);
    await use();
  },
});

export { expect } from '@playwright/test';
```

### Pattern 3: Test Data Factory Functions

```typescript
// apps/web/__tests__/e2e/utils/mockData.ts
import { v4 as uuidv4 } from 'uuid';

export interface TournamentData {
  id: string;
  name: string;
  state: 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  // ... other fields
}

export function createTournament(overrides: Partial<TournamentData> = {}): TournamentData {
  return {
    id: uuidv4(),
    name: `Test Tournament ${Date.now()}`,
    state: 'REGISTRATION_OPEN',
    startAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createUser(overrides: Partial<MockSession['user']> = {}): MockSession['user'] {
  return {
    id: `user-${uuidv4()}`,
    discordId: uuidv4(),
    discordUsername: `TestUser${Date.now()}`,
    ...overrides,
  };
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth mocking | Custom session handling | Existing `utils/auth.ts` | Already handles NextAuth cookies, JWT, CSRF |
| API mocking | Manual route handlers | `page.route()` pattern from existing tests | Already proven working |
| Browser wait logic | Explicit timeouts | Playwright auto-wait | Built-in retry, more reliable |
| Test isolation | Manual cleanup | Database transaction rollback | Ensures clean state |

## Common Pitfalls

### Pitfall 1: Auth Setup Not Applied Before Navigation
**What goes wrong:** Tests fail because middleware rejects request before mock is applied
**Why it happens:** Cookie must be set before page navigation for NextAuth middleware
**How to avoid:** Always call `setupAuthenticatedState()` before any page navigation
**Warning signs:** Tests work in `beforeEach` but fail when navigating

### Pitfall 2: API Mock Not Matching Request URL
**What goes wrong:** Mock returns 404, real API called instead
**Why it happens:** URL matching is exact; localhost:3000 vs localhost:4000 mismatch
**How to avoid:** Use consistent baseURL and wildcard patterns in route matchers
**Warning signs:** Console shows real API errors, tests pass locally but fail in CI

### Pitfall 3: Test Data Leaking Between Tests
**What goes wrong:** Tests fail randomly, data from previous tests appears
**Why it happens:** Database not cleaned or transactions not rolled back
**How to avoid:** Use `test.afterEach` cleanup or database transaction rollback
**Warning signs:** Tests pass in isolation but fail when run together

### Pitfall 4: Missing Error State Testing
**What goes wrong:** Tests only cover happy path, bugs in error handling not caught
**Why it happens:** Focusing on "should work" scenarios only
**How to avoid:** Add tests for: non-existent pages, unauthorized access, API failures, network errors

### Pitfall 5: Over-Mocked Pages
**What goes wrong:** Tests pass but real pages broken
**Why it happens:** Too many mocks, not testing actual component rendering
**How to avoid:** Mock only API calls, let components render naturally; use semantic assertions

## Code Examples

### Existing Auth Pattern (Already Working)
```typescript
// From apps/web/__tests__/e2e/auth.spec.ts
test.beforeEach(async ({ page }) => {
  await setupAuthenticatedState(page);
});

test('access protected route', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### Existing API Mocking Pattern
```typescript
// From apps/web/__tests__/e2e/tournaments.spec.ts
await page.route('**/api/tournaments/**', async (route) => {
  const url = route.request().url();
  if (url.endsWith('/api/tournaments')) {
    await route.fulfill({ status: 200, body: JSON.stringify({ items: [mockTournament] }) });
    return;
  }
  await route.continue();
});
```

### Page Object with Semantic Selectors
```typescript
export class TournamentDetailPage extends BasePage {
  // Use semantic locators - accessible and stable
  readonly tournamentName = this.page.getByRole('heading', { level: 1 });
  readonly registrationStatus = this.page.getByText(/Registration (Open|Closed)/i);
  readonly eventList = this.page.getByRole('list', { name: /events/i });
  readonly registerButton = this.page.getByRole('button', { name: /register/i });

  async clickRegister(): Promise<void> {
    await this.registerButton.click();
  }
}
```

### Testing Error States
```typescript
test('should show 404 for non-existent tournament', async ({ page }) => {
  await setupAuthenticatedState(page);
  await mockTournamentApi(page, { return404: true });

  await page.goto('/tournaments/non-existent-id');

  await expect(page.locator('body')).toContainText(/not found|404/i);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual fetch mocking | `page.route()` API | Pre-existing | Simpler, more reliable |
| Per-test auth setup | Worker-scoped fixtures | Pre-existing | Faster execution |
| Global test fixtures | Role-based custom fixtures | This phase | Tests admin vs player flows |

**Deprecated/outdated:**
- MSW with service workers: Abandoned per docs/solutions/test-failures/e2e-playwright-nextjs-api-mocking.md - `page.route()` works better for Next.js

## Open Questions

1. **Should test data be created via API or directly in database?**
   - What we know: Existing tests use `page.addInitScript()` for client-side mocking
   - What's unclear: Server-side test data creation (registrations, matches) needs DB access
   - Recommendation: Use database factories via Prisma in test setup, respecting existing test isolation

2. **How to handle admin role testing with middleware?**
   - What we know: Middleware checks JWT for route protection
   - What's unclear: How to set admin role in NextAuth session/middleware
   - Recommendation: Add admin fields to mock session, verify middleware accepts them

3. **Should page tests include visual regression checks?**
   - What we know: Screenshots on failure already enabled in playwright.config.ts
   - What's unclear: Full visual regression adds maintenance overhead
   - Recommendation: Skip for v1 - screenshots on failure sufficient for debugging

## Sources

### Primary (HIGH confidence)
- [Microsoft Playwright.dev - Page Object Model](https://playwright.dev/docs/pom) - Official POM patterns
- [Microsoft Playwright.dev - Authentication](https://playwright.dev/docs/auth) - Auth fixture best practices
- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration) - Config options

### Secondary (MEDIUM confidence)
- [Existing test files](apps/web/__tests__/e2e/*.spec.ts) - Proven patterns in this codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright v1.58 already installed and configured
- Architecture: HIGH - Existing Page Object patterns and auth utilities proven
- Pitfalls: HIGH - Based on existing codebase issues documented in docs/

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (30 days - Playwright is stable)
