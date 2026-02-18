---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, performance, web]
dependencies: []
---

# In-Memory Rate Limiting Doesn't Scale

## Problem Statement

The rate limiter uses an in-memory Map which doesn't work in serverless/multi-instance deployments and has potential memory leak from setInterval cleanup.

**Why it matters:** Rate limiting ineffective in production with multiple instances.

## Findings

**Location:** `apps/web/lib/ratelimit.ts:37-47`

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
```

## Proposed Solutions

### Solution A: Use Redis for rate limiting
- **Description:** Replace in-memory Map with Redis
- **Pros:** Works across instances
- **Cons:** Adds Redis dependency
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution A** - Use Redis for distributed rate limiting.

## Technical Details

**Affected Files:**
- `apps/web/lib/ratelimit.ts`

## Acceptance Criteria

- [ ] Works in multi-instance deployment
- [ ] Proper cleanup of old entries

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Web Portal Domain
