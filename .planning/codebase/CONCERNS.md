# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Large Service Files:**
- Issue: `apps/bot/src/services/matchService.ts` contains 1035 lines - multiple responsibilities mixed together
- Files: `apps/bot/src/services/matchService.ts`
- Impact: Difficult to maintain, test, and understand. Single responsibility violation.
- Fix approach: Split into smaller services: `threadService.ts`, `checkinService.ts`, `scoreService.ts`

**Large Polling Service:**
- Issue: `apps/bot/src/services/pollingService.ts` has 463 lines handling polling logic
- Files: `apps/bot/src/services/pollingService.ts`
- Impact: Complex polling state management, hard to test individual flows
- Fix approach: Extract job processors into separate files per operation type

**Large Auth Module:**
- Issue: `apps/web/lib/auth.ts` with 294 lines handling multiple auth flows
- Files: `apps/web/lib/auth.ts`
- Impact: Hard to add new providers or modify flows
- Fix approach: Split into provider-specific modules

**Soft Delete Not Implemented:**
- Issue: No soft delete for historical data preservation
- Files: `packages/database/prisma/schema.prisma:19`
- Impact: Cannot preserve historical data, cascade deletes remove audit context
- Fix approach: Add `deletedAt` DateTime to key models (User, Tournament, Match, Registration)

**Registration Cache Disabled:**
- Issue: Registration sync caching explicitly disabled due to bugs
- Files: `todos/020-complete-p1-registration-sync-cache-disabled.md:25`
- Impact: Reduced performance, unnecessary API calls to Start.gg
- Fix approach: Fix caching logic and re-enable

**DQ Service Missing Features:**
- Issue: Disqualifications not synced back to Start.gg
- Files: `apps/bot/src/services/dqService.ts:140-141`
- Impact: DQs not reflected on Start.gg, inconsistent tournament state
- Fix approach: Add Start.gg mutation call after DQ execution

## Known Bugs

**Race Condition in Check-in Flow:**
- Symptoms: Multiple rapid check-in clicks can cause inconsistent state
- Files: `apps/bot/src/services/matchService.ts`, `apps/bot/src/handlers/checkin.ts`
- Trigger: User clicks check-in button multiple times rapidly
- Workaround: Rate limiting implemented, but race condition still possible at DB level

**Missing State Guard on DQ:**
- Issue: DQ service lacks proper state validation before executing disqualification
- Files: `apps/bot/src/services/dqService.ts`
- Trigger: Calling DQ on already completed match
- Workaround: None - could cause inconsistent state

**Rate Limit Math Incorrect:**
- Issue: Rate limiting calculations may have off-by-one or timing issues
- Files: `todos/022-complete-p1-rate-limit-math-incorrect.md`
- Trigger: Boundary conditions in rate limit window
- Workaround: None documented

**BullMQ Concurrency Not Configurable:**
- Issue: Hardcoded concurrency settings in BullMQ workers
- Files: `todos/021-complete-p1-bullmq-concurrency-not-configurable.md`
- Trigger: High-volume tournaments exceed worker capacity
- Workaround: None - requires config change and restart

## Security Considerations

**API Key Authentication Missing:**
- Risk: API endpoints lack proper API key authentication
- Files: `apps/web/app/api/` (multiple routes)
- Current mitigation: Session-based auth on some endpoints
- Recommendations: Implement API key validation for programmatic access

**Missing Admin Authorization Checks:**
- Risk: Some admin operations may not verify Discord permissions
- Files: `apps/bot/src/commands/admin.ts`
- Current mitigation: Database check for TournamentAdmin role
- Recommendations: Verify Discord guild permissions in addition to DB

**OAuth State Not Validated:**
- Risk: OAuth state parameter may not be properly validated in all flows
- Files: `todos/080-pending-p1-oauth-state-not-validated.md`
- Current mitigation: State parameter used but validation gaps possible
- Recommendations: Ensure state expiry and uniqueness validation

**Insecure Token Fallback (Fixed):**
- Risk: Previously allowed base64 encoding instead of encryption
- Files: `apps/web/app/api/auth/callback/startgg/route.ts`
- Current mitigation: Now fails if encryption not configured
- Recommendations: None - properly fixed

**IP Spoofing Rate Limit Bypass:**
- Risk: Rate limiting can be bypassed via IP spoofing
- Files: `todos/057-pending-p1-ip-spoofing-rate-limit-bypass.md`
- Current mitigation: None
- Recommendations: Use trusted proxy headers, implement proper IP validation

**Bot Rate Limiter Race Condition:**
- Risk: Race condition in rate limiter could allow spam
- Files: `todos/072-pending-p1-bot-rate-limiter-race.md`
- Current mitigation: Redis-based implementation
- Recommendations: Use atomic Redis operations

## Performance Bottlenecks

**N+1 Query Patterns:**
- Problem: Multiple database queries in loops
- Files: `apps/bot/src/services/registrationSyncService.ts`
- Cause: Fetching individual records instead of batch
- Improvement path: Use `findMany` with `where-in` clauses

**No Pagination on List Endpoints:**
- Problem: API returns all records without pagination
- Files: `todos/041-pending-p2-no-pagination.md`
- Cause: Not implemented
- Improvement path: Add cursor-based pagination

**Sequential Event Processing:**
- Problem: Events processed one at a time instead of parallel
- Files: `apps/bot/src/services/pollingService.ts`
- Cause: Sequential await in loop
- Improvement path: Use Promise.all for independent operations

**Redis TLS Not Configured for Production:**
- Problem: Redis connection lacks TLS in production
- Files: `todos/004-complete-p2-redis-tls-production.md`
- Cause: Not configured
- Improvement path: Add TLS configuration for Redis connections

## Fragile Areas

**Match State Machine:**
- Why fragile: Complex state transitions with many edge cases
- Files: `apps/bot/src/services/matchService.ts`, `packages/shared/src/constants.ts`
- Safe modification: Add new states at end, always validate transitions
- Test coverage: State transition tests exist but incomplete

**Registration Sync:**
- Why fragile: Race conditions between Start.gg and Discord registrations
- Files: `apps/bot/src/services/registrationSyncService.ts`
- Safe modification: Use transactions, add idempotency keys
- Test coverage: Integration tests exist

**Button Interaction Routing:**
- Why fragile: String-based prefix matching, no type safety
- Files: `apps/bot/src/handlers/buttonHandlers.ts`
- Safe modification: Add TypeScript types for interaction prefixes
- Test coverage: Basic handler tests exist

**Event Handler Loading:**
- Why fragile: Dynamic loading, errors not visible until runtime
- Files: `apps/bot/src/utils/eventLoader.ts`, `apps/bot/src/utils/commandLoader.ts`
- Safe modification: Add validation on load, startup checks
- Test coverage: Loader tests exist

## Scaling Limits

**Polling Interval:**
- Current capacity: Default 30s poll interval, configurable per tournament
- Limit: Cannot handle tournaments with >1000 matches in progress simultaneously
- Scaling path: Implement dynamic interval adjustment based on tournament size

**Database Connections:**
- Current capacity: Default Prisma connection pool
- Limit: Connection exhaustion under high load
- Scaling path: Configure connection pool based on deployment

**Redis Memory:**
- Current capacity: Rate limiting and job queues stored in Redis
- Limit: Memory exhaustion with many queued jobs
- Scaling path: Implement job cleanup, use Redis Cluster

## Dependencies at Risk

**discord.js v14:**
- Risk: Major version could introduce breaking changes
- Impact: Command and event handlers would need updates
- Migration plan: Monitor release notes, test in staging

**next-auth v4:**
- Risk: v5 available with breaking changes
- Impact: Auth configuration changes needed
- Migration plan: Plan migration to v5, test OAuth flows

**Prisma:**
- Risk: Schema changes in major versions
- Impact: Migration complexity
- Migration plan: Keep schema backward compatible

**MSW v2:**
- Risk: Some breaking changes from v1
- Impact: Test mock updates needed
- Migration plan: Review migration guide

## Missing Critical Features

**Admin API Endpoints:**
- Problem: No REST API for tournament administration
- Blocks: External tool integration, automation
- Priority: High

**Registration API:**
- Problem: No public API for registration management
- Blocks: Third-party registration tools
- Priority: High

**DQ API:**
- Problem: No API for disqualification operations
- Blocks: Admin tooling
- Priority: Medium

**Check-in API:**
- Problem: No API for check-in operations
- Blocks: Custom check-in workflows
- Priority: Medium

## Test Coverage Gaps

**Button Handler Tests:**
- What's not tested: All button interaction paths
- Files: `apps/bot/src/handlers/`
- Risk: Edge cases in button handling could cause unexpected behavior
- Priority: High

**Web API Routes:**
- What's not tested: Most API route error cases
- Files: `apps/web/app/api/`
- Risk: API could return 500 on invalid input
- Priority: High

**Service Edge Cases:**
- What's not tested: Error recovery paths in services
- Files: `apps/bot/src/services/*.ts`
- Risk: Unhandled errors crash bot
- Priority: High

**E2E Tests:**
- What's not tested: Full user flows in web portal
- Files: `apps/web/__tests__/e2e/`
- Risk: UI issues undetected
- Priority: Medium

---

*Concerns audit: 2026-02-25*
