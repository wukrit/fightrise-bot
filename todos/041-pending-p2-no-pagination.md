---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, performance, web]
dependencies: []
---

# No Pagination on Collection Endpoints

## Problem Statement

Tournament listing and match endpoints return all results without pagination. Could cause performance issues with large datasets.

**Why it matters:** Memory issues with large result sets, slow responses.

## Findings

**Location:** `apps/web/app/api/tournaments/route.ts` and `/api/matches/route.ts`

```typescript
const tournaments = await prisma.tournament.findMany({
  // No skip/take for pagination
});
```

## Proposed Solutions

### Solution A: Add pagination
- **Description:** Add skip/take with page parameters
- **Pros:** Handles large datasets
- **Cons:** API changes required
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution A** - Add pagination to collection endpoints.

## Technical Details

**Affected Files:**
- `apps/web/app/api/tournaments/route.ts`
- `apps/web/app/api/matches/route.ts`

## Acceptance Criteria

- [x] Pagination on /api/tournaments
- [x] Pagination on /api/matches
- [x] Default page size configurable

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Completed | Implemented cursor-based pagination for both endpoints |

## Resources

- Review: Web Portal Domain
