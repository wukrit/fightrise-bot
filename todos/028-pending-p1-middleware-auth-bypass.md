---
status: complete
priority: p1
issue_id: "code-review"
tags: [code-review, security, web, authentication]
dependencies: []
---

# Middleware Authentication Bypass

## Problem Statement

The middleware bypasses authentication for localhost, test ports, and NODE_ENV=test environments based on hostname detection. If NODE_ENV is misconfigured in production or there's a proxy that sets these headers, authentication could be bypassed entirely.

**Why it matters:** Security vulnerability - authentication could be accidentally bypassed in production.

## Findings

**Location:** `apps/web/middleware.ts:30-38`

```typescript
if (isLocalhost || isTestPort || process.env.NODE_ENV === 'test') {
  return true;
}
```

## Proposed Solutions

### Solution A: Remove hostname-based bypass
- **Description:** Remove localhost/test detection and use explicit environment checks only
- **Pros:** More secure, explicit
- **Cons:** Local development may need adjustment
- **Effort:** Small
- **Risk:** Low

### Solution B: Use explicit environment variables
- **Description:** Require explicit ALLOW_UNAUTHENTICATED env var for dev
- **Pros:** Clear intent, no accidental bypass
- **Cons:** Requires env setup
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Remove hostname-based auth bypass.

## Technical Details

**Affected Files:**
- `apps/web/middleware.ts`

## Acceptance Criteria

- [x] No hostname-based auth bypass
- [x] Test environment still works
- [x] Dev environment configured properly

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Fixed | Removed isLocalhost/isTestPort, kept NODE_ENV checks for test and development |

## Resources

- Review: Web Portal Domain
