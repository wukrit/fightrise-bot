---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, reliability, startgg, bot, pr-55]
dependencies: []
---

# Start.gg Sync Fire-and-Forget Lacks Durability

## Problem Statement

If Start.gg sync fails, there's no retry mechanism, no way to identify failed syncs, and no reconciliation path. Matches are marked COMPLETED locally but Start.gg may never receive the result.

## Findings

**Identified by**: performance-oracle, architecture-strategist

**Location**: `/Users/sukritwalia/Documents/Projects/fightrise-bot/apps/bot/src/services/matchService.ts` (lines 659-661)

**Evidence**:

```typescript
syncToStartGG(match.startggSetId, winner.startggEntrantId).catch((err) => {
  console.error(`[ReportScore] Start.gg sync failed for ${match.identifier}:`, err);
});
```

**Impact**:
- At 1% API failure rate with 500 matches: ~5 matches fail to sync per tournament
- Rate limiting during finals could cause cascading failures
- No audit trail of failed syncs

## Proposed Solutions

### Option A: Use BullMQ Queue (Recommended)

**Pros**: Durable, automatic retries, existing infrastructure
**Cons**: More complexity
**Effort**: Medium (2 hours)
**Risk**: Low

```typescript
// In matchService.ts
import { startggSyncQueue } from '../queues/startggSync.js';

await startggSyncQueue.add('syncResult', {
  setId: match.startggSetId,
  winnerEntrantId: winner.startggEntrantId,
  matchId: match.id,
}, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
});
```

### Option B: Add Sync Status Tracking

**Pros**: Simpler, enables manual retry
**Cons**: No automatic retry
**Effort**: Small (1 hour)
**Risk**: Low

Add `startggSyncStatus` field to Match model.

## Recommended Action

Option B for this PR (quick fix), Option A as follow-up work.

## Technical Details

**Affected files**:
- `packages/database/prisma/schema.prisma` (add field)
- `apps/bot/src/services/matchService.ts`

## Acceptance Criteria

- [ ] Failed syncs are tracked in database
- [ ] Admin can identify and retry failed syncs
- [ ] Successful syncs are marked

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Identified during PR #55 code review | Fire-and-forget needs fallback |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/55
