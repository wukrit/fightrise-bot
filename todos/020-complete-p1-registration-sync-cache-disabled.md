---
status: pending
priority: p1
issue_id: "020"
tags: [load-test, bug, performance, startgg-client]
dependencies: []
---

# RegistrationSyncService Cache Disabled (Critical Bug)

## Problem Statement

The `RegistrationSyncService` in `apps/bot/src/services/registrationSyncService.ts` explicitly disables caching for the Start.gg client. This causes redundant API calls during registration sync operations and will severely impact performance during load testing with multiple tournaments.

**Why it matters:** With 10 active tournaments, registration sync could make 300+ API calls/minute, exceeding Start.gg's rate limit of 80/minute. Enabling caching is essential to bring API call volume within acceptable limits.

## Findings

**Location:** `apps/bot/src/services/registrationSyncService.ts:26-30`

```typescript
constructor(startggApiKey: string) {
  this.startggClient = new StartGGClient({
    apiKey: startggApiKey,
    cache: { enabled: false },  // <-- BUG: Caching disabled
    retry: { maxRetries: 3 },
  });
}
```

**Evidence from Performance Oracle review:**
- RegistrationSyncService has caching DISABLED - this is a bug
- Compare with pollingService.ts which correctly enables caching:
  ```typescript
  // pollingService.ts:45-49
  startggClient = new StartGGClient({
    apiKey,
    cache: { enabled: true, ttlMs: 30000, maxEntries: 500 },
    retry: { maxRetries: 3 },
  });
  ```

**Impact:**
- Every syncEventRegistrations call makes fresh API requests
- No deduplication when same data is queried multiple times
- During load testing with 10 tournaments polling every 15 seconds, this creates massive API load

## Proposed Solutions

### Solution 1: Enable Caching (Recommended)

Simply enable caching with appropriate TTL.

```typescript
constructor(startggApiKey: string) {
  this.startggClient = new StartGGClient({
    apiKey: startggApiKey,
    cache: { enabled: true, ttlMs: 30000, maxEntries: 500 },  // Match pollingService config
    retry: { maxRetries: 3 },
  });
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Simple fix, matches existing pattern in pollingService |
| Cons | None - this is a bug fix |
| Effort | Minimal |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/services/registrationSyncService.ts`

**Database changes:** None required

**Components affected:**
- `RegistrationSyncService` constructor
- `fetchEntrantsFromStartgg()` method

## Acceptance Criteria

- [ ] RegistrationSyncService enables caching with TTL matching pollingService (30s)
- [ ] Load test confirms reduced API calls during repeated registration syncs
- [ ] Existing tests continue to pass
- [ ] Rate limit calculations in load test plan updated to reflect cached responses

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-17 | Created from Performance Oracle review | Cache was explicitly disabled, bug confirmed |
