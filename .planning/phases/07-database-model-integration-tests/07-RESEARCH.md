# Phase 7: Database Model Integration Tests - Research

**Researched:** 2026-02-27
**Domain:** Prisma integration testing with Testcontainers
**Confidence:** HIGH

## Summary

Phase 7 requires creating integration tests for all 11 Prisma models. The project already has a solid foundation: Testcontainers setup exists in `/packages/database/src/__tests__/setup.ts`, factory functions are in `seeders.ts`, and basic smoke tests are in place. The main work is to create comprehensive CRUD tests for each model that verify relationships, cascade deletes, and transaction patterns.

**Primary recommendation:** Leverage existing Testcontainers setup, add CRUD tests per model following the transaction rollback pattern from Prisma documentation, and verify relationship integrity.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Container strategy**: Fresh container per test file, shared within that file's tests
- **Lifecycle**: Spin up container at test file start, tear down after all tests in file complete
- **Factory functions**: One factory function per model in seeders.ts
- **Test file location**: `packages/database/src/__tests__/`
- **Data cleanup**: Transaction rollback after each test

### Claude's Discretion

- Test organization (single file per model vs. grouped)
- Specific CRUD operations to test per model
- Relationship test coverage depth

### Deferred Ideas (OUT OF SCOPE)

None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | Integration tests for User model CRUD | Existing seeders.ts has createUser factory; setup.ts provides Testcontainers |
| DB-02 | Integration tests for Tournament model CRUD | createTournament factory exists in seeders.ts |
| DB-03 | Integration tests for Event model CRUD | createEvent factory exists with tournament relation |
| DB-04 | Integration tests for Match model CRUD | createMatch factory with event relation |
| DB-05 | Integration tests for MatchPlayer model CRUD | createMatchPlayer with match and user relations |
| DB-06 | Integration tests for GameResult model CRUD | Need to add factory; requires MatchPlayer relation |
| DB-07 | Integration tests for Dispute model CRUD | Need to add factory; requires Match and User relations |
| DB-08 | Integration tests for Registration model CRUD | createRegistration factory exists |
| DB-09 | Integration tests for TournamentAdmin model CRUD | createTournamentAdmin factory exists |
| DB-10 | Integration tests for GuildConfig model CRUD | createGuildConfig factory exists |
| DB-11 | Integration tests for AuditLog model CRUD | Need to add factory; requires User relation |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.18 | Test framework | Already in project, fast, supports TypeScript |
| @testcontainers/postgresql | ^10.0.0 | Database containers | Already in project, provides isolated PostgreSQL |
| @prisma/client | ^5.7.0 | Database ORM | Already in project |
| Prisma | ^5.7.0 | Database schema/migrations | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv-cli | ^11.0.0 | Environment loading | Already in project for test scripts |

### Installation

No additional packages needed - all required dependencies already exist in `packages/database/package.json`.

## Architecture Patterns

### Recommended Project Structure

```
packages/database/src/__tests__/
├── setup.ts                    # EXISTING - Testcontainers setup/teardown
├── utils/
│   ├── seeders.ts              # EXISTING - Factory functions (9 of 12 models)
│   └── seeders.ts              # NEEDS - GameResult, Dispute, AuditLog factories
├── models/
│   ├── User.test.ts             # NEW - CRUD tests
│   ├── Tournament.test.ts       # NEW - CRUD tests
│   ├── Event.test.ts           # NEW - CRUD tests
│   ├── Match.test.ts           # NEW - CRUD tests
│   ├── MatchPlayer.test.ts     # NEW - CRUD tests
│   ├── GameResult.test.ts      # NEW - CRUD tests
│   ├── Dispute.test.ts         # NEW - CRUD tests
│   ├── Registration.test.ts    # NEW - CRUD tests
│   ├── TournamentAdmin.test.ts # NEW - CRUD tests
│   ├── GuildConfig.test.ts     # NEW - CRUD tests
│   └── AuditLog.test.ts        # NEW - CRUD tests
└── smoke/
    └── database.smoke.test.ts  # EXISTING - Basic connection tests
```

### Pattern 1: Testcontainers Setup with Transaction Rollback

**What:** Each test file sets up a PostgreSQL container once, runs tests with transaction isolation, and rolls back after each test.

**When to use:** All database integration tests.

**Example:**

```typescript
// Source: Existing setup.ts + Prisma docs patterns
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import { createUser } from '../utils/seeders';

describe('User Model', () => {
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    const result = await setupTestDatabase();
    prisma = result.prisma;
    databaseUrl = result.databaseUrl;
  });

  beforeEach(async () => {
    // Start transaction for each test
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    // Rollback after each test
    await prisma.$executeRaw`ROLLBACK`;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create a user', async () => {
    const user = await createUser(prisma, { discordId: '12345' });
    expect(user.discordId).toBe('12345');
  });
});
```

### Pattern 2: Factory Functions with Overrides

**What:** Factory functions accept optional configuration objects, using defaults when not provided.

**When to use:** Creating test data with flexible options.

**Example:**

```typescript
// Source: Existing seeders.ts
interface CreateUserOptions {
  discordId?: string;
  discordUsername?: string;
  startggId?: string;
  // ... other optional fields
}

export async function createUser(
  prisma: PrismaClient,
  options: CreateUserOptions = {}
): Promise<User> {
  const id = uniqueId();
  return prisma.user.create({
    data: {
      discordId: options.discordId ?? `discord-${id}`,
      discordUsername: options.discordUsername ?? `testuser-${id}`,
      // ... other fields with defaults
    },
  });
}
```

### Pattern 3: Cascade Delete Verification

**What:** Tests verify that deleting a parent record cascades to children.

**Example:**

```typescript
it('should cascade delete matches when event is deleted', async () => {
  const tournament = await createTournament(prisma);
  const event = await createEvent(prisma, tournament.id);
  const match = await createMatch(prisma, event.id);

  await prisma.event.delete({ where: { id: event.id } });

  const deletedMatch = await prisma.match.findUnique({ where: { id: match.id } });
  expect(deletedMatch).toBeNull();
});
```

### Anti-Patterns to Avoid

- **Not using transactions:** Each test MUST use transaction rollback to ensure isolation. Without this, tests can leak state and cause flaky results.
- **Skipping container teardown:** Always call `teardownTestDatabase()` in `afterAll` to prevent container leaks.
- **Testing without unique IDs:** Use the existing `uniqueId()` counter pattern to avoid unique constraint violations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database isolation | SQLite mock or in-memory | @testcontainers/postgresql | Real PostgreSQL behavior, exactly matches production |
| Unique IDs | Math.random() strings | Existing uniqueId() counter | Avoids collisions, readable test data |
| Cleanup | Manual DELETE queries | Transaction rollback | Faster, guaranteed cleanup, no residual state |

**Key insight:** The project already has the foundation - Testcontainers setup and 9/12 factory functions exist. The work is completing the missing factories and writing comprehensive CRUD tests.

## Common Pitfalls

### Pitfall 1: Test State Leakage
**What goes wrong:** Tests pass individually but fail when run together due to database state from previous tests.
**Why it happens:** Forgetting to use transaction rollback or clearing between tests.
**How to avoid:** Always wrap each test in a transaction and rollback in `afterEach`.
**Warning signs:** Tests pass with `--run` but fail with `--watch`, or order-dependent failures.

### Pitfall 2: Container Port Conflicts
**What goes wrong:** Tests fail to start container due to port already in use.
**Why it happens:** Previous test run didn't properly clean up container.
**How to avoid:** Ensure `teardownTestDatabase()` is called in `afterAll` regardless of test outcome.
**Warning signs:** "Port is already in use" errors.

### Pitfall 3: Foreign Key Constraint Violations
**What goes wrong:** Tests fail when trying to create records with invalid relations.
**Why it happens:** Not creating parent records before dependent records.
**How to avoid:** Follow proper creation order (e.g., User -> Tournament -> Event -> Match).
**Warning signs:** "Foreign key constraint failed" errors.

### Pitfall 4: Unique Constraint Violations
**What goes wrong:** Tests fail on second run due to duplicate unique values.
**Why it happens:** Using hardcoded IDs instead of generated unique values.
**How to avoid:** Always use the `uniqueId()` counter pattern from existing seeders.ts.
**Warning signs:** "Unique constraint failed" on fields like discordId, startggId.

## Code Examples

### Complete CRUD Test Template

```typescript
// Source: Combined from existing setup.ts, seeders.ts, and Prisma docs
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import { createUser, createTournament, createEvent, resetIdCounter } from '../utils/seeders';

describe('ModelName Model', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    resetIdCounter(); // Reset unique ID counter
    const result = await setupTestDatabase();
    prisma = result.prisma;
  });

  beforeEach(async () => {
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    await prisma.$executeRaw`ROLLBACK`;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Create', () => {
    it('should create a record', async () => {
      // Arrange - using factory
      const user = await createUser(prisma, { discordId: 'test-123' });

      // Act - actual operation
      const found = await prisma.user.findUnique({
        where: { id: user.id }
      });

      // Assert
      expect(found).not.toBeNull();
      expect(found?.discordId).toBe('test-123');
    });
  });

  describe('Read', () => {
    it('should find by unique field', async () => {
      const user = await createUser(prisma, { discordId: 'unique-123' });
      const found = await prisma.user.findUnique({
        where: { discordId: 'unique-123' }
      });
      expect(found?.id).toBe(user.id);
    });
  });

  describe('Update', () => {
    it('should update a record', async () => {
      const user = await createUser(prisma);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { displayName: 'New Name' }
      });
      expect(updated.displayName).toBe('New Name');
    });
  });

  describe('Delete', () => {
    it('should delete a record', async () => {
      const user = await createUser(prisma);
      await prisma.user.delete({ where: { id: user.id } });
      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });
  });

  describe('Relationships', () => {
    it('should create related records', async () => {
      const user = await createUser(prisma);
      const tournament = await createTournament(prisma, { discordGuildId: 'guild-1' });

      const registration = await prisma.registration.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
          status: 'PENDING'
        }
      });

      expect(registration.userId).toBe(user.id);
      expect(registration.tournamentId).toBe(tournament.id);
    });

    it('should cascade delete on parent deletion', async () => {
      const tournament = await createTournament(prisma);
      const event = await createEvent(prisma, tournament.id);

      await prisma.tournament.delete({ where: { id: tournament.id } });

      const deletedEvent = await prisma.event.findUnique({ where: { id: event.id } });
      expect(deletedEvent).toBeNull();
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual cleanup with DELETE | Transaction rollback | Prisma docs recommend | Faster, more reliable |
| One container per test | One container per file | Context7 recommends | Better performance while maintaining isolation |
| SQLite for tests | Testcontainers PostgreSQL | Industry standard | Production parity |

**Deprecated/outdated:**
- Using SQLite for "faster" tests - not recommended as behavior differs from PostgreSQL
- Mocking Prisma client - loses relationship and constraint validation

## Open Questions

1. **Should tests run with real Docker or skip if Docker unavailable?**
   - What we know: Tests require Docker; existing setup throws if container fails
   - What's unclear: CI environment compatibility
   - Recommendation: Use testcontainers' built-in retry/fallback, or mark tests as skipped in CI without Docker

2. **How to handle the 12th model (ApiKey)?**
   - What we know: Schema includes ApiKey model, not mentioned in phase requirements
   - What's unclear: Should it be tested or is it out of scope?
   - Recommendation: Include for completeness since it's part of the schema

3. **Should integration tests be run in Docker or natively?**
   - What we know: `docker:test` runs in containers
   - What's unclear: Local development workflow
   - Recommendation: Follow existing pattern - run tests in Docker for CI, can run locally with Docker running

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 |
| Config file | packages/database/vitest.config.ts |
| Quick run command | `npm run test` (from packages/database) |
| Full suite command | `npm run docker:test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | User CRUD | integration | `npm run test` | No - needs User.test.ts |
| DB-02 | Tournament CRUD | integration | `npm run test` | No - needs Tournament.test.ts |
| DB-03 | Event CRUD | integration | `npm run test` | No - needs Event.test.ts |
| DB-04 | Match CRUD | integration | `npm run test` | No - needs Match.test.ts |
| DB-05 | MatchPlayer CRUD | integration | `npm run test` | No - needs MatchPlayer.test.ts |
| DB-06 | GameResult CRUD | integration | `npm run test` | No - needs GameResult.test.ts |
| DB-07 | Dispute CRUD | integration | `npm run test` | No - needs Dispute.test.ts |
| DB-08 | Registration CRUD | integration | `npm run test` | No - needs Registration.test.ts |
| DB-09 | TournamentAdmin CRUD | integration | `npm run test` | No - needs TournamentAdmin.test.ts |
| DB-10 | GuildConfig CRUD | integration | `npm run test` | No - needs GuildConfig.test.ts |
| DB-11 | AuditLog CRUD | integration | `npm run test` | No - needs AuditLog.test.ts |

### Sampling Rate
- **Per task commit:** `npm run test` (all database tests)
- **Per wave merge:** `npm run docker:test` (full suite in Docker)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/models/User.test.ts` — covers DB-01
- [ ] `src/__tests__/models/Tournament.test.ts` — covers DB-02
- [ ] `src/__tests__/models/Event.test.ts` — covers DB-03
- [ ] `src/__tests__/models/Match.test.ts` — covers DB-04
- [ ] `src/__tests__/models/MatchPlayer.test.ts` — covers DB-05
- [ ] `src/__tests__/models/GameResult.test.ts` — covers DB-06
- [ ] `src/__tests__/models/Dispute.test.ts` — covers DB-07
- [ ] `src/__tests__/models/Registration.test.ts` — covers DB-08
- [ ] `src/__tests__/models/TournamentAdmin.test.ts` — covers DB-09
- [ ] `src/__tests__/models/GuildConfig.test.ts` — covers DB-10
- [ ] `src/__tests__/models/AuditLog.test.ts` — covers DB-11
- [ ] `src/__tests__/utils/seeders.ts` — needs GameResult, Dispute, AuditLog factories

## Sources

### Primary (HIGH confidence)
- [Testcontainers Node.js /testcontainers/testcontainers-node] - PostgreSQL container setup, snapshots
- [Prisma Docs /prisma/docs] - Transaction rollback for test isolation, CRUD operations

### Secondary (MEDIUM confidence)
- Existing codebase patterns from setup.ts, seeders.ts, smoke tests

### Tertiary (LOW confidence)
- None needed - HIGH confidence from existing project foundation

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - All dependencies already in project
- Architecture: HIGH - Existing setup.ts provides foundation, Prisma docs confirm patterns
- Pitfalls: HIGH - Known pitfalls covered with prevention strategies

**Research date:** 2026-02-27
**Valid until:** 30 days (stable technology - vitest/Testcontainers/Prisma)

---

## RESEARCH COMPLETE

**Phase:** 7 - Database Model Integration Tests
**Confidence:** HIGH

### Key Findings
1. Foundation already exists: Testcontainers setup in setup.ts, factory functions in seeders.ts (9/12 models)
2. Need to add 3 missing factories: GameResult, Dispute, AuditLog
3. Need to create 11 test files (one per model) following transaction rollback pattern
4. All required dependencies already in package.json
5. Pattern confirmed: transaction rollback for test isolation, container per file

### File Created
`/home/ubuntu/fightrise-bot/.planning/phases/07-database-model-integration-tests/07-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All dependencies already in project |
| Architecture | HIGH | Existing setup.ts + seeders.ts provide solid foundation |
| Pitfalls | HIGH | Known pitfalls documented with prevention strategies |

### Open Questions
1. Should ApiKey (12th model) be tested despite not being in requirements? - Recommend yes for completeness
2. How to handle CI without Docker? - Use testcontainers fallback or skip tests
3. Local vs Docker test execution - Follow existing pattern

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
