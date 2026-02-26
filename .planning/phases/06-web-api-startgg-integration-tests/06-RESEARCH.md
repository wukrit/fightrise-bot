# Phase 6: Web API + Start.gg Integration Tests - Research

**Researched:** 2026-02-26
**Domain:** Integration testing with Testcontainers (PostgreSQL) and MSW (GraphQL mocking)
**Confidence:** HIGH

## Summary

Phase 6 requires creating integration tests for Next.js API routes and the Start.gg GraphQL client. The project already has substantial infrastructure in place: Testcontainers setup in `packages/database`, MSW handlers in `packages/startgg-client`, and seeders in `packages/database`. The main work is creating proper integration tests that combine real database (via Testcontainers) with mocked external APIs (via MSW).

**Primary recommendation:** Reuse existing test infrastructure (setup.ts, seeders.ts, MSW server) and create integration tests in `apps/web/app/api/` that spin up a real PostgreSQL container while mocking Start.gg API calls.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Test database: Testcontainers - spin up isolated PostgreSQL container per test suite
- Lifecycle: One container per test run (reusable between runs if schema unchanged)
- State management: Transaction rollback between tests (fast and clean)
- Mocking: MSW to intercept HTTP requests
- Mock location: Central fixtures folder (shared across test suites)
- Coverage: Both success and error responses for each query/mutation
- Fixtures: Static fixtures (hardcoded, not dynamically generated)
- Test scope: HTTP requests through Next.js routing (most realistic)
- Organization: By feature (tournaments, matches, registrations)
- Test data: Factory functions co-located with tests

### Claude's Discretion
- Match Phase 5 approach where applicable for consistency
- Reuse existing test patterns from apps/bot/src/__tests__/harness

### Deferred Ideas (OUT OF SCOPE)
None

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| API-01 | Integration tests for /api/tournaments/[id]/registrations | Existing route exists, needs Testcontainers integration test |
| API-02 | Integration tests for /api/tournaments/[id]/matches | Existing route exists, needs Testcontainers integration test |
| API-03 | Integration tests for /api/matches/[id]/report | Existing route exists, needs Testcontainers integration test |
| API-04 | Integration tests for /api/matches/[id]/dispute | Existing route exists, needs Testcontainers integration test |
| API-05 | Integration tests for /api/matches/[id]/dq | Existing route exists, needs Testcontainers integration test |
| API-06 | Integration tests for /api/tournaments/[id]/admin/audit | Existing test file uses vi.mock - needs rewrite for Testcontainers |
| SGG-01 | Integration tests for GraphQL query functions | MSW handlers exist, need integration tests with real client |
| SGG-02 | Integration tests for GraphQL mutation functions | MSW handlers exist, need integration tests with real client |
| SGG-03 | Tests for client retry logic and error handling | retry.ts exists, needs comprehensive error handling tests |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | latest | Test framework | Already configured in project |
| @testcontainers/postgresql | ^12.x | PostgreSQL container for tests | Industry standard for DB testing |
| msw | ^2.x | API mocking (GraphQL + HTTP) | Already in project, handles both REST/GraphQL |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fightrise/database | workspace:* | Prisma client | Test database setup |
| @fightrise/startgg-client | workspace:* | Start.gg API client | Testing GraphQL queries/mutations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Testcontainers | Mock Prisma with vi.mock | Phase 5 approach - but Phase 6 specifically requires "realistic database" per CONTEXT.md |
| MSW | Nock/Sinon | MSW already in project, supports GraphQL natively |

**Installation:**
```bash
# Dependencies already in project:
npm install --save-dev vitest @testcontainers/postgresql msw
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/app/api/
├── tournaments/
│   ├── [id]/
│   │   ├── registrations/
│   │   │   ├── route.test.ts      # Integration test
│   │   │   └── route.ts           # Implementation
│   │   ├── matches/
│   │   │   ├── route.test.ts       # Integration test
│   │   │   └── route.ts
│   │   └── admin/
│   │       └── audit/
│   │           ├── route.test.ts   # Rewrite from vi.mock to Testcontainers
│   │           └── route.ts
├── matches/
│   ├── [id]/
│   │   ├── report/
│   │   │   ├── route.test.ts      # Integration test
│   │   │   └── route.ts
│   │   ├── dispute/
│   │   │   ├── route.test.ts      # Integration test
│   │   │   └── route.ts
│   │   └── dq/
│   │       ├── route.test.ts      # Integration test
│   │       └── route.ts

packages/startgg-client/src/__tests__/
├── integration/
│   ├── queries.test.ts            # GraphQL query tests
│   ├── mutations.test.ts          # GraphQL mutation tests
│   └── retry.test.ts              # Retry logic tests
```

### Pattern 1: Integration Test with Testcontainers
**What:** API route tests that use a real PostgreSQL database
**When to use:** Testing API routes that interact with the database
**Example:**
```typescript
// apps/web/app/api/tournaments/[id]/registrations/route.test.ts
import { setupTestDatabase, clearTestDatabase } from '@fightrise/database/src/__tests__/setup';
import { createUser, createTournament, createRegistration } from '@fightrise/database/src/__tests__/utils/seeders';
import { createTournamentRegistrationRouteHandler } from './route';

describe('GET /api/tournaments/[id]/registrations', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    ({ prisma, databaseUrl } = await setupTestDatabase());
  });

  beforeEach(async () => {
    await clearTestDatabase(prisma);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should return registrations for tournament', async () => {
    // Arrange - create test data with seeders
    const user = await createUser(prisma, { discordId: 'user-1' });
    const tournament = await createTournament(prisma, { name: 'Test Tournament' });
    await createRegistration(prisma, user.id, tournament.id, { status: 'CONFIRMED' });

    // Act - call the API route handler directly
    const request = new NextRequest(`http://localhost/api/tournaments/${tournament.id}/registrations`);
    const response = await GET(request, { params: Promise.resolve({ id: tournament.id }) });

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.registrations).toHaveLength(1);
  });
});
```

### Pattern 2: MSW GraphQL Integration Tests
**What:** Tests for Start.gg client that mock the GraphQL API
**When to use:** Testing the GraphQL query/mutation functions
**Example:**
```typescript
// packages/startgg-client/src/__tests__/integration/queries.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../../__mocks__/server';
import { handlers, errorHandlers } from '../../__mocks__/handlers';
import { mockTournaments } from '../../__mocks__/fixtures';
import { getTournament } from '../../client';

describe('Start.gg Query Integration Tests', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('getTournament', () => {
    it('should return tournament data on success', async () => {
      const result = await getTournament('tournament-1');
      expect(result).toEqual(mockTournaments.weeklyLocal);
    });

    it('should throw on tournament not found', async () => {
      server.use(errorHandlers.notFound);
      await expect(getTournament('non-existent')).rejects.toThrow('Tournament not found');
    });

    it('should throw on rate limit', async () => {
      server.use(errorHandlers.rateLimited);
      await expect(getTournament('tournament-1')).rejects.toThrow('Rate limit');
    });
  });
});
```

### Pattern 3: Retry Logic Testing
**What:** Tests for the retry wrapper with configurable options
**When to use:** Testing error handling and retry behavior
**Example:**
```typescript
// packages/startgg-client/src/__tests__/integration/retry.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry } from '../../retry';

describe('withRetry', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on rate limit error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-rate-limit errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(withRetry(fn)).rejects.toThrow('Network error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

### Anti-Patterns to Avoid
- **Using vi.mock for database:** Phase 6 specifically requires "realistic database" per CONTEXT.md - using mocks defeats the purpose
- **Testing without cleanup:** Each test must clear database state to prevent pollution
- **Ignoring error responses:** Per CONTEXT.md, both success AND error responses must be tested
- **Not using transaction rollback:** Per CONTEXT.md, use transaction rollback for fast cleanup

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database isolation | Custom DB spawning | @testcontainers/postgresql | Handles Docker lifecycle, networking, cleanup |
| GraphQL mocking | Custom HTTP interceptors | MSW | Native GraphQL support, handler reuse |
| Test data creation | Manual inserts | Existing seeders in packages/database | Already covers all models |
| Transaction rollback | Manual DELETE queries | Prisma `$transaction` with rollback | Faster, more reliable |

**Key insight:** The project already has all infrastructure in place. The work is composing it correctly for integration tests.

---

## Common Pitfalls

### Pitfall 1: Test Isolation Failure
**What goes wrong:** Tests pollute each other with leftover database records
**Why it happens:** Not clearing database between tests, or tests sharing container
**How to avoid:** Use `clearTestDatabase()` in beforeEach, one container per test suite
**Warning signs:** Intermittent failures, tests passing in isolation but failing together

### Pitfall 2: MSW Handler Conflicts
**What goes wrong:** MSW handlers from different test files conflict
**Why it happens:** Not resetting handlers in afterEach, handlers accumulating
**How to avoid:** Always call `server.resetHandlers()` in afterEach
**Warning signs:** Tests pass individually but fail when run together

### Pitfall 3: Async Parameter Issues
**What goes wrong:** Next.js route params are Promises in newer versions
**Why it happens:** Next.js 14+ changed params to be async
**How to avoid:** Use `{ params: Promise.resolve({ id: '...' }) }` pattern (see existing test)
**Warning signs:** Type errors about Promise not matching string

### Pitfall 4: Environment Variable Conflicts
**What goes wrong:** Tests use wrong DATABASE_URL
**Why it happens:** Not setting DATABASE_URL for Testcontainers in test environment
**How to avoid:** Use setupTestDatabase() which handles URL automatically
**Warning signs:** Connection refused errors, tests hanging

---

## Code Examples

### Setting Up Testcontainers for API Tests
```typescript
// apps/web/app/api/tournaments/[id]/registrations/route.test.ts
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '@fightrise/database/src/__tests__/setup';
import { createUser, createTournament, createRegistration } from '@fightrise/database/src/__tests__/utils/seeders';
import { PrismaClient } from '@prisma/client';

describe('Tournament Registrations API', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Spin up container and push schema
    const setup = await setupTestDatabase();
    prisma = setup.prisma;
  });

  beforeEach(async () => {
    // Clear between tests for isolation
    await clearTestDatabase(prisma);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Tests...
});
```

### Setting Up MSW for Start.gg Tests
```typescript
// packages/startgg-client/src/__tests__/integration/queries.test.ts
import { setupMswServer } from '../../__mocks__/server';
import { mockTournaments } from '../../__mocks__/fixtures';

const { beforeAll, afterEach, afterAll } = setupMswServer();

describe('Start.gg Queries', () => {
  beforeAll(() => {
    // Configured by setupMswServer()
  });

  afterEach(() => {
    // Reset to default handlers
    server.resetHandlers();
  });

  afterAll(() => {
    // Clean up MSW
    server.close();
  });
});
```

### Testing Error Responses with MSW
```typescript
// In handlers.ts - add error handlers
export const errorHandlers = {
  notFound: graphql.query('GetTournament', () => {
    return HttpResponse.json({
      data: { tournament: null },
      errors: [{ message: 'Tournament not found', path: ['tournament'] }]
    });
  }),
  unauthorized: graphql.query('GetTournament', () => {
    return HttpResponse.json({
      data: null,
      errors: [{ message: 'Invalid credentials', path: ['currentUser'] }]
    }, { status: 401 });
  }),
  rateLimited: graphql.query('GetTournament', () => {
    return HttpResponse.json({
      data: null,
      errors: [{ message: 'Rate limit exceeded', extensions: { code: 'RATE_LIMITED' } }]
    }, { status: 429 });
  }),
};

// In test - use specific error
it('handles not found', async () => {
  server.use(errorHandlers.notFound);
  await expect(getTournament('invalid')).rejects.toThrow();
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vi.mock for database | Testcontainers PostgreSQL | Phase 6 (this phase) | Realistic testing |
| No GraphQL mocking | MSW with handlers | Phase 6 (this phase) | External API isolation |
| Unit tests only | Integration tests | Phase 5/6 | End-to-end behavior verification |

**Deprecated/outdated:**
- Mock Prisma with vi.mock: Was Phase 5 approach, Phase 6 requires real database
- Static fixtures only: Now also testing error scenarios with dynamic handlers

---

## Open Questions

1. **API route auth mocking**
   - What's the current approach for mocking NextAuth in API tests?
   - Recommendation: Check existing route.test.ts for patterns (may need to mock session)

2. **Test parallelization**
   - Should tests run in parallel? Testcontainers can handle this
   - Recommendation: Keep serial for now, add parallel later if needed

3. **Container reuse**
   - Should container be reused across test runs?
   - Per CONTEXT.md: "reusable between runs if schema unchanged" - implement caching

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing) |
| Config file | apps/web/vitest.config.ts |
| Quick run command | `npm run docker:test -- --filter=web` |
| Full suite command | `npm run docker:test:integration` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|---------------|
| API-01 | Tournament registrations endpoint | integration | `npm run docker:test -- --filter=web` | No - needs creation |
| API-02 | Tournament matches endpoint | integration | `npm run docker:test -- --filter=web` | No - needs creation |
| API-03 | Match score reporting | integration | `npm run docker:test -- --filter=web` | No - needs creation |
| API-04 | Match dispute | integration | `npm run docker:test -- --filter=web` | No - needs creation |
| API-05 | Match DQ | integration | `npm run docker:test -- --filter=web` | No - needs creation |
| API-06 | Admin audit log | integration | Rewrite existing test | Partial - needs rewrite |
| SGG-01 | GraphQL queries | integration | `npm run docker:test -- --filter=startgg-client` | No - needs creation |
| SGG-02 | GraphQL mutations | integration | `npm run docker:test -- --filter=startgg-client` | No - needs creation |
| SGG-03 | Retry/error handling | integration | `npm run docker:test -- --filter=startgg-client` | Partial - retry.test.ts exists |

### Sampling Rate
- **Per task commit:** `npm run docker:test -- --filter=web --testNamePattern="<test>"`
- **Per wave merge:** `npm run docker:test:integration`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/app/api/tournaments/[id]/registrations/route.test.ts` - covers API-01
- [ ] `apps/web/app/api/tournaments/[id]/matches/route.test.ts` - covers API-02
- [ ] `apps/web/app/api/matches/[id]/report/route.test.ts` - covers API-03
- [ ] `apps/web/app/api/matches/[id]/dispute/route.test.ts` - covers API-04
- [ ] `apps/web/app/api/matches/[id]/dq/route.test.ts` - covers API-05
- [ ] `packages/startgg-client/src/__tests__/integration/queries.test.ts` - covers SGG-01
- [ ] `packages/startgg-client/src/__tests__/integration/mutations.test.ts` - covers SGG-02
- [ ] Rewrite existing `apps/web/app/api/tournaments/[id]/admin/audit/route.test.ts` for Testcontainers

---

## Sources

### Primary (HIGH confidence)
- [MSW GraphQL Documentation](https://mswjs.io/docs/graphql/intercepting-operations) - GraphQL handler patterns
- [Testcontainers for Node.js](https://www.testcontainers.org/modules/databases/postgresql/) - PostgreSQL container setup
- Existing codebase: packages/database/src/__tests__/setup.ts - Testcontainers implementation
- Existing codebase: packages/startgg-client/src/__mocks__/ - MSW setup

### Secondary (MEDIUM confidence)
- [Next.js API Route Testing](https://nextjs.org/docs/app/building-your-application/testing) - Testing patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, well-documented
- Architecture: HIGH - Existing Phase 5 patterns to follow
- Pitfalls: HIGH - Common issues well-understood from Phase 5

**Research date:** 2026-02-26
**Valid until:** 30 days (stable domain)
