---
status: pending
priority: p1
issue_id: "021"
tags: [load-test, bullmq, performance, configuration]
dependencies: []
---

# BullMQ Worker Concurrency Not Configurable

## Problem Statement

The BullMQ worker in `pollingService.ts` uses default concurrency of 1, which is a significant bottleneck for load testing. The load test plan mentions this but does not address making the concurrency configurable or testing different concurrency levels.

**Why it matters:** With 10 tournaments polling every 15 seconds during active tournament states, the single worker can only process one tournament at a time. This creates a queue backlog and prevents the system from handling burst load.

## Findings

**Location:** `apps/bot/src/services/pollingService.ts:64-70`

```typescript
worker = new Worker<PollJobData>(
  QUEUE_NAME,
  async (job: Job<PollJobData>) => {
    await pollTournament(job.data.tournamentId);
  },
  { connection } // Concurrency defaults to 1
);
```

**Evidence from Performance Oracle review:**
- BullMQ worker has concurrency=1 (main bottleneck not addressed)
- The comment on line 69 explicitly states "Concurrency defaults to 1"
- This was identified as a CRITICAL finding in the review

**Impact:**
- Only one tournament poll can run at a time
- Queue backs up during active tournaments
- Load test cannot properly simulate realistic concurrent load

## Proposed Solutions

### Solution 1: Make Concurrency Configurable via Environment Variable

Add an environment variable to control worker concurrency.

```typescript
const WORKER_CONCURRENCY = parseInt(process.env.BULLMQ_CONCURRENCY ?? '1', 10);

worker = new Worker<PollJobData>(
  QUEUE_NAME,
  async (job: Job<PollJobData>) => {
    await pollTournament(job.data.tournamentId);
  },
  {
    connection,
    concurrency: WORKER_CONCURRENCY,
  }
);
```

Add to `.env.example`:
```
# BullMQ worker concurrency (default: 1)
BULLMQ_CONCURRENCY=4
```

| Aspect | Assessment |
|--------|------------|
| Pros | Simple change, allows testing different concurrency levels |
| Cons | None |
| Effort | Small |
| Risk | Low - defaults to existing behavior |

### Solution 2: Add Concurrency Scaling Test Scenario

Update load test plan to include concurrency scaling scenarios.

| Aspect | Assessment |
|--------|------------|
| Pros | Validates system under different concurrency loads |
| Cons | Requires test infrastructure changes |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/services/pollingService.ts`
- `.env.example` (add new variable)

**Environment changes:**
- Add `BULLMQ_CONCURRENCY` to `.env.example`

**Components affected:**
- `startPollingService()` function
- Worker initialization

## Acceptance Criteria

- [ ] BullMQ worker concurrency is configurable via BULLMQ_CONCURRENCY env var
- [ ] Default remains 1 (backward compatible)
- [ ] Load test includes concurrency scaling scenarios
- [ ] Tests verify worker handles concurrent jobs correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-17 | Created from Performance Oracle review | Confirmed concurrency=1 in pollingService.ts:69 |
