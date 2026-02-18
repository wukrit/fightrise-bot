---
status: complete
priority: p2
issue_id: "077"
tags: [code-review, agent-native, api]
dependencies: []
---

# Missing Registration Approval/Rejection API

## Problem Statement

Bot handles registration approval/rejection via buttons but no API endpoints exist. Admins cannot approve/reject registrations programmatically.

**Why it matters:** Agent-native gap - admins need programmatic control.

## Findings

**Location:** Bot handles via buttons (`reg-approve`, `reg-reject`) but no API.

## Proposed Solutions

### Solution A: Create Registration Approval/Rejection APIs (Recommended)
- **Description:** Add POST /api/registrations/[id]/approve and /reject
- **Pros:** Completes agent-native parity
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Solution A - Create approval/rejection endpoints.

## Technical Details

**Affected Files:**
- New: `apps/web/app/api/registrations/[id]/approve/route.ts`
- New: `apps/web/app/api/registrations/[id]/reject/route.ts`

## Acceptance Criteria

- [x] Approve endpoint works
- [x] Reject endpoint works
- [x] Requires admin permissions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |
| 2026-02-18 | Completed | Created both API endpoints |

## Resources

- PR: #97
