# Phase 8: E2E Page Tests - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Browser automation tests for web portal pages using Playwright. Tests verify user flows work correctly in a real browser. Covers 7 pages: Dashboard, Tournaments list, Tournament detail, Tournament registrations admin, Tournament matches admin, Admin audit log, Account settings.

</domain>

<decisions>
## Implementation Decisions

### Auth handling
- Use NextAuth mock/override to bypass real auth — faster, more isolated
- Shared session per test file (sign in once in beforeAll, reuse for all tests)
- Tests must verify different user roles (admin vs player)
- Fail fast if auth setup fails

### Test structure
- Page Object Model: create Page classes with methods — selectors + actions encapsulated
- Page objects contain only locators + helper methods, not assertions (tests own assertions)
- Pages share a common base class for navigation and layout
- Page object files located in tests/e2e/pages/ alongside tests
- Naming convention: PascalCase (DashboardPage, TournamentListPage)
- Method chaining for multi-step flows: page.gotoTournaments().createTournament()
- Selector strategy: Semantic locators (getByRole, getByLabel) — accessible, stable
- Rely on Playwright's auto-wait for elements, not explicit waits

### Test data
- Factory functions that create data on-demand in each test
- Clean up created data after each test — clean state
- Use database transaction rollback for test data isolation
- Create full realistic data hierarchy (orgs, events, brackets, players), not minimal

### Coverage approach
- Multiple tests per page: page loads, interactions, edge cases, error states
- Standard coverage: page renders + elements + interactions work + data displays + navigation works
- Test on Chromium only for speed
- Run tests in parallel for faster execution

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-e2e-page-tests*
*Context gathered: 2026-02-27*
