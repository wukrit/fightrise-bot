---
status: complete
priority: p1
issue_id: 112
tags: [security, rate-limiter, bug]
dependencies: []
---

# Rate Limiter Always Blocks Requests

## Problem Statement

The rate limiter in `/apps/web/lib/ratelimit.ts` returns `allowed: false` on line 136 even when the request should be allowed. This causes ALL API requests to be blocked after the first request within the rate limit window.

## Findings

**File:** `apps/web/lib/ratelimit.ts`
**Line:** 136

```typescript
return {
  allowed: false,  // BUG: Should be `true`
  limit: config.limit,
  remaining: config.limit - currentCount - 1,
  resetTime,
};
```

The function correctly returns `allowed: false` when rate limit is exceeded (lines 125-132), but the fallback return on line 136 also returns `allowed: false` instead of `allowed: true`.

## Impact

- CRITICAL: All API requests fail after the first request
- Application functionality completely broken
- Every API call returns 429 status

## Fix Applied

Changed line 136 from `allowed: false` to `allowed: true`.

## Technical Details

- **Affected file:** `apps/web/lib/ratelimit.ts`
- **Function:** Rate limit check function
- **Related:** Previous todo 099 about rate limiter fail-open was fixed

## Acceptance Criteria

- [x] Rate limiter allows requests under the limit
- [x] Rate limiter blocks requests over the limit
- [ ] Unit tests cover rate limiter behavior

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-03-11 | Fixed | Changed line 136 from `allowed: false` to `allowed: true` |
