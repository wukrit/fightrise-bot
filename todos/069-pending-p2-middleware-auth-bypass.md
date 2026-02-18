---
status: complete
priority: p2
issue_id: "069"
tags: [code-review, security, middleware]
dependencies: []
---

# Middleware Localhost Auth Bypass Too Permissive

## Problem Statement

The middleware allows all requests from localhost without checking environment, potentially bypassing auth in production if misconfigured.

**Why it matters:** Security risk if production hostname resolves to localhost or 127.0.0.1.

## Findings

**Location:** `apps/web/middleware.ts`

```typescript
const isLocalhost = req.nextUrl.hostname === 'localhost' ||
                   req.nextUrl.hostname === '127.0.0.1' ||
                   req.nextUrl.hostname === '0.0.0.0';
if (isLocalhost || isTestPort || process.env.NODE_ENV === 'test') {
  return true;
}
```

The check doesn't verify NODE_ENV before allowing localhost.

## Proposed Solutions

### Solution A: Add environment check
- **Description:** Only allow localhost bypass in dev/test
- **Pros:** Prevents production bypass
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
if ((isLocalhost || isTestPort) && isDev) {
  return true;
}
```

## Recommended Action

**Solution A** - Add environment check.

## Technical Details

**Affected Files:**
- `apps/web/middleware.ts`

## Acceptance Criteria

- [ ] Localhost bypass only in dev/test

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |
| 2026-02-18 | Completed | Added NODE_ENV check before localhost bypass |

## Resources

- PR: #97
