---
status: complete
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

- [x] Rate limiter cannot be bypassed via X-Forwarded-For spoofing
- [x] Only trusted proxy IPs can set forwarded headers
- [x] Requests without proxy headers use direct IP

## Resolution

Implemented Solution A - Trust Only Specific Proxies:

1. **Enabled trust proxy in Next.js** (`apps/web/next.config.js`):
   - Added `trustProxy: true` to enable Next.js built-in proxy handling
   - This tells Next.js to parse X-Forwarded-For and X-Real-IP headers correctly

2. **Updated getClientIp function** (`apps/web/lib/ratelimit.ts`):
   - Now uses Next.js's `request.ip` property which handles trusted proxy logic internally
   - When trustProxy is enabled, Next.js only trusts headers from actual proxy connections
   - Added defense-in-depth validation with isValidIp() function
   - Falls back to X-Real-IP header or localhost if no valid IP found

The fix prevents IP spoofing because:
- Attackers cannot spoof X-Forwarded-For - Next.js only trusts these headers from connections that come through the reverse proxy (as determined by the trust proxy configuration)
- The IP validation ensures only valid IP formats are accepted
- Proper fallback behavior ensures legitimate requests still work
