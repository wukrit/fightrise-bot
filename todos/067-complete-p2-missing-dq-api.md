---
status: complete
priority: p2
issue_id: "067"
tags: [code-review, agent-native, api]
dependencies: []
---

# Missing DQ API Endpoint for Agents

## Problem Statement

The DQ (disqualification) service has no REST API endpoint, preventing agents from programmatically disqualifying players.

**Why it matters:** Agents cannot automate DQ workflows (e.g., no-show detection).

## Findings

**Location:** `apps/bot/src/services/dqService.ts`

No REST API endpoint exists for the DQ functionality.

## Proposed Solutions

### Solution A: Add DQ API endpoint
- **Description:** Create POST /api/matches/[id]/dq endpoint
- **Pros:** Enables agent automation
- **Cons:** Requires auth, state validation
- **Effort:** Medium
- **Risk:** Medium

## Recommended Action

**Solution A** - Add DQ API endpoint.

## Technical Details

**Affected Files:**
- `apps/web/app/api/matches/[id]/dq/route.ts` (new)
- `apps/bot/src/services/dqService.ts`

## Acceptance Criteria

- [ ] POST endpoint exists for DQ
- [ ] Auth validation
- [ ] State guard prevents invalid transitions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |
| 2026-02-18 | Completed | Created POST /api/matches/[id]/dq endpoint |

## Resources

- PR: #97
