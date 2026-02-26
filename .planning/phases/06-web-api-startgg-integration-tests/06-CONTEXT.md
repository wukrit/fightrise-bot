# Phase 6: Web API + Start.gg Integration Tests - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Create integration tests for Next.js API routes and Start.gg GraphQL client. Tests use realistic database (Testcontainers) and mocked external APIs (MSW). This is distinct from Phase 5's unit tests which used vi.mock.

</domain>

<decisions>
## Implementation Decisions

### Test Database
- **Strategy**: Testcontainers - spin up isolated PostgreSQL container per test suite
- **Lifecycle**: One container per test run (reusable between runs if schema unchanged)
- **State management**: Transaction rollback between tests (fast and clean)

### Mocking Strategy
- **External API**: MSW (Mock Service Worker) to intercept HTTP requests
- **Location**: Central fixtures folder (shared across test suites)
- **Coverage**: Both success and error responses for each query/mutation
- **Fixtures**: Static fixtures (hardcoded, not dynamically generated)

### Test Scope
- **API testing**: HTTP requests through Next.js routing (most realistic)
- **Organization**: By feature (tournaments, matches, registrations)
- **Scope**: Full integration - real database + mocked external API

### Test Data
- **Creation**: Factory functions that create test data on demand
- **Amount**: Minimal per-test (create only what's needed for each test)
- **Location**: Co-located with tests (in __tests__/utils or tests/helpers)

</decisions>

<specifics>
## Specific Ideas

- Match Phase 5 approach where applicable for consistency
- Reuse existing test patterns from apps/bot/src/__tests__/harness

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-web-api-startgg-integration-tests*
*Context gathered: 2026-02-26*
