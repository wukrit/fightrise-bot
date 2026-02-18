---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, security, web, rate-limiting]
dependencies: []
---

# Missing Rate Limiting on API Routes

## Problem Statement

Only the NextAuth route (/api/auth/[...nextauth]) implements rate limiting. All other API routes have no rate limiting protection.

**Why it matters:** Endpoints like tournament listing, match reporting, and registration are vulnerable to abuse.

## Findings

**Location:** `apps/web/app/api/tournaments/route.ts` and others

## Proposed Solutions

### Solution A: Apply rate limiting to all routes
- **Description:** Apply existing rate limiting middleware to remaining endpoints
- **Pros:** Consistent protection
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Apply rate limiting to all API routes.

## Technical Details

**Affected Files:**
- Multiple API route files

## Acceptance Criteria

- [ ] Rate limiting on all API routes
- [ ] Configurable per-endpoint

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Web Portal Domain
