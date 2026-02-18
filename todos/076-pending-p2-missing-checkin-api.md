---
status: completed
priority: p2
issue_id: "076"
tags: [code-review, agent-native, api]
dependencies: []
---

# Missing Check-in API Endpoint

## Problem Statement

The bot has check-in button handler but no corresponding API endpoint. Agents cannot check players in for matches via API.

**Why it matters:** Core user action has no agent-accessible API.

## Findings

**Location:** Bot has handler at `apps/bot/src/handlers/checkin.ts`, but no API equivalent.

## Proposed Solutions

### Solution A: Create Check-in API Endpoint (Recommended)
- **Description:** Add POST /api/matches/[id]/checkin endpoint
- **Pros:** Completes agent-native parity
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

Endpoint should:
1. Require authentication
2. Validate player is in match
3. Use transaction with state guard
4. Return success/error

## Recommended Action

Solution A - Create check-in endpoint.

## Technical Details

**Affected Files:**
- New: `apps/web/app/api/matches/[id]/checkin/route.ts`

## Acceptance Criteria

- [x] POST /api/matches/[id]/checkin works
- [x] Requires authentication
- [x] Uses state guard pattern

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |
| 2026-02-18 | Completed | Created check-in API endpoint |

## Resources

- PR: #97
