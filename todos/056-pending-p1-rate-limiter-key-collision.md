---
status: pending
priority: p1
issue_id: "056"
tags: [code-review, security, rate-limiting]
dependencies: []
---

# Rate Limiter Key Collision Vulnerability

## Problem Statement

The Redis-based rate limiter uses `Math.random()` to generate member keys for the sorted set, which is not cryptographically secure and can lead to key collisions. This allows attackers to potentially bypass rate limiting by exploiting predictable random patterns.

## Findings

1. **Bot rate limiter** (`apps/bot/src/events/interactionCreate.ts` lines 22-27):
   ```typescript
   await redis.zadd(key, now, `${now}:${Math.random()}`);
   ```

2. **Web rate limiter** (`apps/web/lib/ratelimit.ts` line 84):
   ```typescript
   pipeline.zadd(windowKey, now.toString(), `${now}-${Math.random()}`);
   ```

## Proposed Solutions

### Solution A: Use crypto.randomUUID() (Recommended)
Replace `Math.random()` with `crypto.randomUUID()` for secure unique keys.

**Pros:** Cryptographically secure, built into Node.js, no dependencies

**Cons:** Slight performance overhead (negligible)

**Effort:** Small

### Solution B: Use nanoid
Install `nanoid` package and use for key generation.

**Pros:** Fast, secure

**Cons:** Additional dependency

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `apps/bot/src/events/interactionCreate.ts`
  - `apps/web/lib/ratelimit.ts`

## Acceptance Criteria

- [ ] Rate limiter keys use cryptographically secure random values
- [ ] No key collisions possible under normal operation
- [ ] Tests verify uniqueness of generated keys
