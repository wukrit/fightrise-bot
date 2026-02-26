# Phase 5: Bot Services Unit Tests - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add unit tests for bot services (matchService, scoreHandler, checkinHandler, tournamentService, dqService, registrationSyncService, pollingService) and shared utilities. Use existing DiscordTestClient harness. This is Phase 5 of v2.0 Testing Enhancements.

</domain>

<decisions>
## Implementation Decisions

### Test Isolation
- **Database**: Real database using Testcontainers (spin up per test suite, reset data between tests)
- **Discord API**: Mocked using DiscordTestClient (fast, no network calls)
- **Start.gg API**: Mocked using MSW handlers
- **Test data**: Factory functions that create fresh data per test
- **Time-dependent code**: Use fake timers for deterministic behavior
- **Async operations**: Await all async operations

### Coverage Targets
- **Line coverage**: 90% minimum
- **Branch coverage**: All branches (not just lines)
- **Priority**: Critical user flows first (match flow, score reporting), then other services
- **Difficult-to-test code**: Document why uncovered code exists
- **CI enforcement**: Block CI if coverage drops below target
- **Scope**: New code must meet target, existing code is grandfathered

### Test Structure
- **Location**: `tests/` folder at package root
- **Naming**: `.test.ts` suffix (e.g., `matchService.test.ts`)
- **Organization**: By service (e.g., `tests/services/matchService.test.ts`)
- **Fixtures**: `tests/fixtures/` or `tests/__fixtures__/` folder
- **Setup**: Shared `setup.ts` runs before all tests
- **Describe blocks**: One per function/method being tested

### Test Scope
- **Happy + Error**: Test both successful and error cases
- **Edge cases**: Include null, undefined, empty, zero value tests
- **Happy paths**: Multiple scenarios per function, not just one

</decisions>

<specifics>
## Specific Ideas

- Critical user flows: Tournament setup -> Registration -> Check-in -> Match flow
- Score reporting is a critical path that must have comprehensive tests
- Use factories pattern for test data creation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-bot-services-unit-tests*
*Context gathered: 2026-02-26*
