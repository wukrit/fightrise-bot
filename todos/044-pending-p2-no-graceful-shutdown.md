---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, reliability, bot]
dependencies: []
---

# No Graceful Shutdown for BullMQ Worker

## Problem Statement

The stop function pauses the worker but doesn't wait for in-flight jobs to complete before closing Redis connection. Jobs could be lost.

**Why it matters:** In-flight jobs lost during shutdown.

## Findings

**Location:** `apps/bot/src/services/pollingService.ts:418-443`

```typescript
await worker.pause();
// No wait for current jobs to complete
await queue.close(); // Could lose jobs
await closeRedisConnection();
```

## Proposed Solutions

### Solution A: Add job completion waiting
- **Description:** Wait for jobs to complete before closing
- **Pros:** No lost jobs
- **Cons:** Slower shutdown
- **Effort:** Small
- **Risk:** Low

```typescript
await worker.drain(); // Wait for all jobs to complete
// Then close
```

## Recommended Action

**Solution A** - Add job completion waiting.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/pollingService.ts`

## Acceptance Criteria

- [ ] Jobs complete before shutdown
- [ ] Configurable timeout

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Discord Bot Domain
