---
status: complete
priority: p3
issue_id: "078"
tags: [code-review, consistency, authorization]
dependencies: []
---

# Inconsistent Admin Role Requirements

## Problem Statement

Admin endpoints use inconsistent role requirements. Register endpoint requires OWNER/ADMIN, registrations includes MODERATOR.

**Why it matters:** Unclear permission boundaries for API consumers.

## Findings

**Locations:**
- `apps/web/app/api/tournaments/[id]/admin/register/route.ts` (lines 69-75): OWNER, ADMIN only
- `apps/web/app/api/tournaments/[id]/admin/registrations/route.ts` (lines 50-56): OWNER, ADMIN, MODERATOR

## Proposed Solutions

### Solution A: Standardize on MODERATOR (Recommended)
- **Description:** Allow MODERATOR role for both endpoints
- **Pros:** Consistent, matches Discord mod pattern
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Solution A - Standardize roles.

## Technical Details

**Affected Files:**
- `apps/web/app/api/tournaments/[id]/admin/register/route.ts`

## Acceptance Criteria

- [ ] Both endpoints use same roles

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
