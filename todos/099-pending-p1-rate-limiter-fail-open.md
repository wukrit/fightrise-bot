---
status: complete
priority: p1
issue_id: "099"
tags: [code-review, security, performance]
dependencies: []
---

# Rate Limiter Fails Open When Redis Unavailable

## Problem Statement

Both the bot and web app rate limiters fail open when Redis is unavailable, allowing unlimited requests. This enables potential DDoS attacks during Redis outages.

**Why it matters:** Security-critical vulnerability that defeats the entire purpose of rate limiting during infrastructure failures.

## Findings

**Location 1:** `apps/bot/src/events/interactionCreate.ts:21-24`
```typescript
// Rate limiting fails open - returns false if Redis unavailable
if (!redis) {
  return false; // Allows unlimited requests
}
```

**Location 2:** `apps/web/lib/ratelimit.ts:76-86`
```typescript
// Fail open if Redis isn't available
if (!r) {
  return {
    allowed: true, // Unlimited requests allowed!
    // ...
  };
}
```

## Proposed Solutions

### Solution 1: Fail Closed (Recommended)

When Redis is unavailable, deny requests rather than allow unlimited access.

| Aspect | Assessment |
|--------|------------|
| Pros | Secure by default, prevents attacks during outages |
| Cons | Legitimate users blocked during Redis issues |
| Effort | Small |
| Risk | Low |

### Solution 2: Circuit Breaker

Implement a circuit breaker that allows limited requests when Redis is down.

| Aspect | Assessment |
|--------|------------|
| Pros | Graceful degradation with rate limits |
| Cons | More complex implementation |
| Effort | Medium |
| Risk | Medium |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/events/interactionCreate.ts`
- `apps/web/lib/ratelimit.ts`

## Acceptance Criteria

- [ ] Rate limiter denies requests when Redis unavailable
- [ ] Bot rate limiting fails closed
- [ ] Web rate limiting fails closed
- [ ] Tests verify fail-closed behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from code review | Found in both bot and web rate limiters |
| 2026-03-11 | Verified already fixed | Bot returns `true` (blocked) and web returns `allowed: false` when Redis unavailable - both fail closed |

## Resources

- Related: OWASP Rate Limiting Cheat Sheet
