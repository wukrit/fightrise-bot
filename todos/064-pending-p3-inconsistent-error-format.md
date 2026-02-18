---
status: pending
priority: p3
issue_id: "064"
tags: [code-review, api, error-handling]
dependencies: []
---

# Inconsistent Error Response Format

## Problem Statement

API routes return inconsistent error response formats - some return `{ error: string }` while structures vary.

## Findings

**Locations:**
- `apps/web/app/api/matches/[id]/report/route.ts`
- `apps/web/app/api/tournaments/[id]/route.ts`

## Proposed Solutions

### Solution A: Create Standardized Error Helper
Create `createErrorResponse(message, statusCode)` helper.

**Pros:** Consistent API, easier client handling

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - Multiple API routes in `apps/web/app/api/`

## Acceptance Criteria

- [ ] Standardized error response format
- [ ] Consistent status codes
