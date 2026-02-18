---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, types, shared]
dependencies: []
---

# Untyped Interaction ID Parsing

## Problem Statement

parseInteractionId returns untyped result - prefix and parts are just strings.

**Why it matters:** No type safety for interaction prefixes.

## Findings

**Location:** `packages/shared/src/interactions.ts:3-5`

```typescript
export function parseInteractionId(customId: string) {
  const [prefix, ...parts] = customId.split(':');
  return { prefix, parts };  // Returns untyped
}
```

## Proposed Solutions

### Solution A: Add return type
- **Description:** Add proper typing for prefix using INTERACTION_PREFIX
- **Pros:** Type safety
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Add return type to parseInteractionId.

## Technical Details

**Affected Files:**
- `packages/shared/src/interactions.ts`

## Acceptance Criteria

- [ ] Typed return value
- [ ] Prefix is typed union

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: Shared Utilities
