# Technology Stack: Testing (v2.0)

**Project:** FightRise Testing Enhancements
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

The FightRise project already has a comprehensive testing infrastructure in place across its monorepo. This research confirms the existing stack is well-suited for the v2.0 testing goals. The only required change is upgrading vitest in the bot package for version consistency.

## Existing Testing Stack

### Test Runners

| Package | Current Version | Purpose | Status |
|---------|-----------------|---------|--------|
| `vitest` | v1.0.0 (bot), v4.0.18 (web/database/startgg-client) | Unit and integration tests | Needs upgrade in bot |
| `@playwright/test` | v1.58.0 | E2E browser tests | Complete |

**Recommendation:** Upgrade bot package from vitest v1.0.0 to v4.0.18 for consistency and latest features. Vitest v4.x provides better TypeScript support, improved performance, and Vite 7 compatibility.

### Unit & Integration Testing

| Package | Current Version | Purpose | Status |
|---------|-----------------|---------|--------|
| `@testing-library/react` | v14.0.0 | React component testing | Complete |
| `@testing-library/jest-dom` | v6.0.0 | DOM assertions | Complete |
| `@testing-library/user-event` | v14.6.1 | User interaction simulation | Complete |
| `jsdom` | v23.0.0 | DOM environment for Node | Complete |

### API Mocking

| Package | Current Version | Purpose | Status |
|---------|-----------------|---------|--------|
| `msw` | v2.0.0 | REST/GraphQL mocking | Complete |
| `playwright-msw` | v3.0.1 | MSW + Playwright integration | Complete |

**Existing MSW Setup:**
- Handlers: `packages/startgg-client/src/__mocks__/handlers.ts`
- Fixtures: `packages/startgg-client/src/__mocks__/fixtures.ts`
- Server: `packages/startgg-client/src/__mocks__/server.ts`

### Database Testing

| Package | Current Version | Purpose | Status |
|---------|-----------------|---------|--------|
| `@testcontainers/postgresql` | v10.0.0 | PostgreSQL test containers | Complete |

**Existing Database Test Setup:**
- Setup: `packages/database/src/__tests__/setup.ts`
- Seeders: `packages/database/src/__tests__/utils/seeders.ts`

### E2E Testing

| Package | Current Version | Purpose | Status |
|---------|-----------------|---------|--------|
| `@playwright/test` | v1.58.0 | Browser automation | Complete |

**Existing Playwright Configuration:**
- Config: `playwright.config.ts`
- E2E Tests: `apps/web/__tests__/e2e/*.spec.ts`
- Auth Utils: `apps/web/__tests__/e2e/utils/auth.ts`

## Existing Test Infrastructure by Package

### Bot Package (`apps/bot/`)

| Test Type | Location | Config |
|-----------|----------|--------|
| Unit | `src/__tests__/services/*.test.ts` | `vitest.config.ts` |
| Integration | `src/__tests__/integration/*.integration.test.ts` | `vitest.integration.config.ts` |
| E2E | `src/__tests__/e2e/*.e2e.test.ts` | `vitest.e2e.config.ts` |
| Smoke | `src/__tests__/smoke/*.smoke.test.ts` | `vitest.smoke.config.ts` |
| Load | `src/__tests__/load/*.test.ts` | Load scenarios |

**Bot Test Harness:** `apps/bot/src/__tests__/harness/`
- `DiscordTestClient` - Mock Discord.js client
- `MockInteraction` - Simulate slash commands
- `MockChannel` - Track messages and threads

### Web Package (`apps/web/`)

| Test Type | Location | Config |
|-----------|----------|--------|
| Unit | `__tests__/unit/*.test.ts` | `vitest.config.ts` |
| E2E | `__tests__/e2e/*.spec.ts` | `playwright.config.ts` |
| Smoke | `__tests__/smoke/*.smoke.spec.ts` | `vitest.smoke.config.ts` |

### Database Package (`packages/database/`)

| Test Type | Location | Config |
|-----------|----------|--------|
| Unit | `src/__tests__/unit/*.test.ts` | `vitest.config.ts` |
| Smoke | `src/__tests__/smoke/*.smoke.test.ts` | `vitest.smoke.config.ts` |

### Start.gg Client Package (`packages/startgg-client/`)

| Test Type | Location | Config |
|-----------|----------|--------|
| Unit | `src/__tests__/unit/*.test.ts` | `vitest.config.ts` |
| Smoke | `src/__tests__/smoke/*.smoke.test.ts` | `vitest.smoke.config.ts` |

## Recommended Versions

| Package | Recommended Version | Rationale |
|---------|---------------------|------------|
| `vitest` | ^4.0.18 (align all packages) | Latest stable, Vite 7 compatible |
| `@playwright/test` | ^1.58.0 (keep current) | Current version is recent |
| `msw` | ^2.0.0 (keep current) | Current version supports GraphQL |
| `@testcontainers/postgresql` | ^10.0.0 (keep current) | Stable PostgreSQL support |
| `@testing-library/react` | ^14.0.0 (keep current) | Compatible with React 18 |
| `@testing-library/jest-dom` | ^6.0.0 (keep current) | Stable |
| `@testing-library/user-event` | ^14.6.1 (keep current) | Current |

## Integration Patterns

### Unit Test Pattern

```typescript
// apps/bot/src/services/myService.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('serviceName', () => {
  it('should do something', () => {
    // Test implementation
  });
});
```

### Integration Test Pattern (with Database)

```typescript
// packages/database/src/__tests__/integration/myTest.integration.ts
import { setupPostgres, teardownPostgres } from '../setup';

describe('database operations', () => {
  beforeAll(async () => {
    await setupPostgres();
  });

  afterAll(async () => {
    await teardownPostgres();
  });

  it('should create a record', async () => {
    // Test with real database via Prisma
  });
});
```

### E2E Test Pattern (Playwright)

```typescript
// apps/web/__tests__/e2e/myFlow.spec.ts
import { test, expect } from '@playwright/test';

test('user flow', async ({ page }) => {
  await page.goto('/tournaments');
  await expect(page.locator('h1')).toContainText('Tournaments');
});
```

### API Mocking Pattern (MSW)

```typescript
// In test setup
import { setupServer } from 'msw/node';
import { handlers } from '@fightrise/startgg-client/__mocks__/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Docker-Based Testing Commands

| Command | Purpose |
|---------|---------|
| `docker:infra` | Start Postgres and Redis |
| `docker:test` | Run unit tests (all packages) |
| `docker:test:integration` | Run integration tests |
| `docker:test:e2e` | Run Playwright E2E tests |
| `docker:test:smoke` | Run smoke tests (all packages) |
| `docker:lint` | Run ESLint |

## Optional Enhancements

Based on the existing infrastructure, **no new libraries are required**. The current stack covers all v2.0 testing goals:

1. **Unit tests** - Vitest + @testing-library
2. **Integration tests** - Vitest + Testcontainers + MSW
3. **E2E tests** - Playwright with MSW integration
4. **Smoke tests** - Vitest against real APIs (requires credentials)

### Potential Future Additions

| Package | Purpose | When to Add |
|---------|---------|-------------|
| `happy-dom` | Faster DOM alternative to jsdom | Performance-critical React tests |
| `vitest-coverage-v8` | Advanced V8 coverage | Detailed coverage reports |
| `vitest-sonar` | SonarQube integration | CI coverage tracking |

## Installation

The testing dependencies are already installed. Only vitest upgrade needed in bot:

```bash
# In apps/bot/
npm install -D vitest@^4.0.18

# Verify all packages have consistent versions
npm ls vitest
```

## Sources

- [Vitest](https://vitest.dev/) - v4.0.17 latest (2026)
- [Playwright](https://playwright.dev/) - Cross-browser testing
- [MSW](https://mswjs.io/) - API mocking for browser and Node.js
- [Testcontainers](https://testcontainers.com/) - Database containerization
- [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) - React component testing

---

*Stack research for: FightRise Testing Enhancements v2.0*
*Researched: 2026-02-26*
