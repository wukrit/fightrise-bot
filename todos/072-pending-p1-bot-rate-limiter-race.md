---
status: complete
priority: p1
issue_id: "072"
tags: [code-review, performance, rate-limiting]
dependencies: []
---

# Race Condition in Discord Bot Rate Limiter

## Problem Statement

The Discord bot rate limiter adds entry BEFORE removing old entries, causing incorrect counting. New entry is added, then old entries are removed AFTER, meaning the count includes entries that should have been removed.

**Why it matters:** Rate limiting can be bypassed with rapid requests.

## Findings

**Location:** `apps/bot/src/events/interactionCreate.ts` (lines 32-39)

Current (WRONG) order:
```typescript
await redis.zadd(key, now, `${now}:${randomUUID()}`);  // Adds FIRST
await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
await redis.zremrangebyscore(key, 0, windowStart);     // Removes AFTER
const count = await redis.zcard(key);                   // Counts everything
```

## Proposed Solutions

### Solution A: Reorder Operations (Recommended)
- **Description:** Remove old entries first, then add new, then count
- **Pros:** Correct ordering, matches rate limiting best practices
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
// Correct order:
await redis.zremrangebyscore(key, 0, windowStart);     // Remove OLD first
await redis.zadd(key, now, `${now}:${randomUUID()}`);  // Then add NEW
const count = await redis.zcard(key);                   // Then count
await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
```

Or use pipeline for atomicity:
```typescript
const pipeline = redis.pipeline();
pipeline.zremrangebyscore(key, 0, windowStart);
pipeline.zadd(key, now, `${now}:${randomUUID()}`);
pipeline.zcard(key);
const results = await pipeline.exec();
const count = results[2][1];
await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
```

## Recommended Action

Solution A - Reorder operations with pipeline.

## Technical Details

**Affected Files:**
- `apps/bot/src/events/interactionCreate.ts`

## Acceptance Criteria

- [ ] Old entries removed before new added
- [ ] Count is accurate

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
