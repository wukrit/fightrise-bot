---
status: pending
priority: p1
issue_id: "057"
tags: [code-review, security, rate-limiting]
dependencies: []
---

# IP Spoofing Allows Rate Limit Bypass

## Problem Statement

The web rate limiter trusts the `X-Forwarded-For` header directly without validating that it comes from a trusted proxy. Attackers can spoof this header to bypass rate limiting.

## Findings

**File:** `apps/web/lib/ratelimit.ts` lines 150-156

```typescript
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();  // Trusts user-supplied header
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}
```

## Proposed Solutions

### Solution A: Trust Only Specific Proxies (Recommended)
Only trust X-Forwarded-For from known reverse proxy IPs.

**Pros:** Simple, effective

**Cons:** Requires knowing infrastructure

**Effort:** Small

### Solution B: Check for Proxy Header Presence
Only trust X-Forwarded-For if request comes from a known proxy IP.

**Pros:** More flexible

**Cons:** Requires IP list maintenance

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `apps/web/lib/ratelimit.ts`

## Acceptance Criteria

- [ ] Rate limiter cannot be bypassed via X-Forwarded-For spoofing
- [ ] Only trusted proxy IPs can set forwarded headers
- [ ] Requests without proxy headers use direct IP
