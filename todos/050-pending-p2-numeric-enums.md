---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, types, startgg-client]
dependencies: []
---

# Numeric Enums Instead of Strong Types

## Problem Statement

Many fields use number instead of proper TypeScript enums. This loses semantic meaning and IDE autocomplete.

**Why it matters:** Poor type safety, harder to maintain.

## Findings

**Location:** `packages/startgg-client/src/types.ts:56-84`

```typescript
export interface Set {
  id: string;
  state: number;  // Should be enum
  // ...
}
```

## Proposed Solutions

### Solution A: Define proper enums
- **Description:** Create TournamentState, SetState enums
- **Pros:** Type safety, semantic meaning
- **Cons:** More code
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution A** - Define proper TypeScript enums.

## Technical Details

**Affected Files:**
- `packages/startgg-client/src/types.ts`

## Acceptance Criteria

- [ ] State fields use enums
- [ ] IDE autocomplete works

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Completed | Converted numeric enums to string enums in Start.gg client |

## Resources

- Review: Start.gg Client
