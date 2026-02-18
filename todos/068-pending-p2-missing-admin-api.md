---
status: pending
priority: p2
issue_id: "068"
tags: [code-review, agent-native, api]
dependencies: []
---

# Missing Admin Operations API Endpoints

## Problem Statement

Admin operations (register user, view registrations) are only available as Discord slash commands, not REST APIs. Agents cannot programmatically perform admin operations.

**Why it matters:** Limits automation capabilities for tournament management.

## Findings

**Location:** `apps/bot/src/commands/admin.ts`

REST API equivalents don't exist for:
- Manual registration
- Viewing registrations
- Other admin actions

## Proposed Solutions

### Solution A: Add admin API endpoints
- **Description:** Create REST endpoints for admin operations
- **Pros:** Enables agent automation
- **Cons:** Requires auth, permission checks
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

**Solution A** - Add admin API endpoints.

## Technical Details

**Affected Files:**
- `apps/web/app/api/tournaments/[id]/admin/register/route.ts` (new)
- `apps/web/app/api/tournaments/[id]/admin/registrations/route.ts` (new)

## Acceptance Criteria

- [ ] POST /admin/register endpoint
- [ ] GET /admin/registrations endpoint
- [ ] Permission validation

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
