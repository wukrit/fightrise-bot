---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, security, infrastructure]
dependencies: []
---

# Redis TLS Not Enforced in Production

## Problem Statement

The Redis connection in `redis.ts` does not enforce TLS for production environments. While the connection URL may include TLS settings, there's no explicit enforcement or validation.

**Why it matters:** Unencrypted Redis connections in production could expose sensitive job data to network eavesdropping.

## Findings

**Location:** `apps/bot/src/lib/redis.ts:19-27`

```typescript
redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 3000);
    console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
});
```

**Evidence from Security Sentinel review:**
- Severity: MEDIUM
- No TLS options explicitly configured
- Production Redis should use `rediss://` URLs

## Proposed Solutions

### Solution 1: URL Validation (Recommended)

Validate that production uses TLS-enabled Redis URLs.

```typescript
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required');
}

// Warn if not using TLS in production
if (process.env.NODE_ENV === 'production' && !redisUrl.startsWith('rediss://')) {
  console.warn('[Redis] WARNING: Production should use rediss:// (TLS) URLs');
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Simple, doesn't break local dev |
| Cons | Only warns, doesn't enforce |
| Effort | Small |
| Risk | Low |

### Solution 2: Enforce TLS in Production

Throw an error if production doesn't use TLS.

```typescript
if (process.env.NODE_ENV === 'production' && !redisUrl.startsWith('rediss://')) {
  throw new Error('Production REDIS_URL must use TLS (rediss://)');
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Strict enforcement |
| Cons | May break deployments if misconfigured |
| Effort | Small |
| Risk | Medium - could cause startup failures |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/lib/redis.ts`

**Environment variables:**
- `REDIS_URL` should be `rediss://...` in production
- `NODE_ENV` used to determine environment

## Acceptance Criteria

- [ ] Production Redis connections are validated for TLS
- [ ] Warning or error for non-TLS in production
- [ ] Local development still works with `redis://localhost`
- [ ] Documentation updated for Redis URL requirements

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Security sentinel flagged TLS concern |

## Resources

- ioredis TLS options: https://github.com/redis/ioredis#tls-options
- PR #52
