---
status: complete
priority: p1
issue_id: "066"
tags: [code-review, security, api, validation]
dependencies: []
---

# Missing Input Validation on Score Reporting API

## Problem Statement

The score reporting API endpoint accepts user input without validation, allowing potentially malicious or invalid data to be processed.

**Why it matters:** Security vulnerability - could accept non-numeric values, negative numbers, or extremely large scores.

## Findings

**Location:** `apps/web/app/api/matches/[id]/report/route.ts`

```typescript
const { winnerId, player1Score, player2Score } = body;
```

No Zod validation schema is applied to the request body.

## Proposed Solutions

### Solution A: Add Zod validation schema
- **Description:** Add validation using existing Zod schemas
- **Pros:** Type-safe, consistent with project patterns
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

### Solution B: Add manual validation checks
- **Description:** Add manual validation with specific bounds
- **Pros:** Fine-grained control
- **Cons:** More code, less type-safe
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add Zod validation schema.

## Technical Details

**Affected Files:**
- `apps/web/app/api/matches/[id]/report/route.ts`

## Acceptance Criteria

- [x] Zod schema validates winnerId as CUID
- [x] Scores validated as integers with reasonable bounds (0-99)
- [x] Invalid input returns 400 error

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |
| 2026-02-18 | Completed | Added Zod validation schema to score reporting API |

## Resources

- PR: #97
