---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, types, shared]
dependencies: []
---

# No StartGGError Class

## Problem Statement

ErrorCode.STARTGG_ERROR exists but there's no corresponding StartGGError class like DiscordError.

**Why it matters:** Inconsistent error handling, can't catch Start.gg specific errors.

## Findings

**Location:** `packages/shared/src/errors.ts`

```typescript
// Line 21-22 - Code exists
STARTGG_ERROR: 'STARTGG_ERROR',

// But no class like:
export class StartGGError extends FightRiseError { ... }
```

## Proposed Solutions

### Solution A: Add StartGGError class
- **Description:** Create StartGGError class following DiscordError pattern
- **Pros:** Consistent error handling
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add StartGGError class.

## Technical Details

**Affected Files:**
- `packages/shared/src/errors.ts`

## Acceptance Criteria

- [ ] StartGGError class exists
- [ ] Used consistently in Start.gg client

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Shared Utilities
