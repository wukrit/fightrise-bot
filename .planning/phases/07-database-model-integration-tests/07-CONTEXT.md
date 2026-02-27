# Phase 7: Database Model Integration Tests - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Create integration tests for all 11 Prisma models using Testcontainers. Tests verify CRUD operations, relationships, and transaction patterns. This follows Phases 5 (unit tests) and 6 (API tests) in the v2.0 Testing Enhancements.

</domain>

<decisions>
## Implementation Decisions

### Test Isolation
- **Container strategy**: Fresh container per test file, shared within that file's tests
- **Lifecycle**: Spin up container at test file start, tear down after all tests in file complete
- **Rationale**: Balances isolation (fresh container = clean state) with performance (reuse within file)

### Test Data Approach
- **Factory functions**: One factory function per model (createUser, createTournament, etc.)
- **Default behavior**: Minimal required fields — factories create only what's needed, tests can override
- **Location**: Co-located with tests in `tests/` folder
- **Rationale**: Flexible, readable, easy to create test-specific variations

### Test File Location
- **Directory**: `packages/database/src/__tests__/`
- **Organization**: One test file per model (e.g., `User.test.ts`, `Tournament.test.ts`)
- **Rationale**: Close to the models being tested, clear ownership, easy to find

### Data Cleanup Strategy
- **Method**: Transaction rollback — wrap each test in a transaction, rollback after
- **Timing**: After each test (not after describe or file)
- **Rationale**: Fast (no deletes needed), clean (guaranteed rollback), no state leakage

</decisions>

<specifics>
## Specific Ideas

- Follow patterns from Phase 5 and Phase 6 where applicable
- Test all 11 models: User, Tournament, Event, Match, MatchPlayer, GameResult, Dispute, Registration, TournamentAdmin, GuildConfig, AuditLog
- Test relationships: one-to-many, many-to-many, cascade deletes
- Test transaction patterns: $transaction, $connect, $disconnect

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-database-model-integration-tests*
*Context gathered: 2026-02-27*
