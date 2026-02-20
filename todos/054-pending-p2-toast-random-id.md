---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, ui, bug]
dependencies: []
---

# Toast Uses Math.random() for IDs

## Problem Statement

Using Math.random() for toast IDs is not secure and can produce collisions.

**Why it matters:** Non-unique IDs can cause toast removal bugs.

## Findings

**Location:** `packages/ui/src/Toast.tsx:108`

```tsx
const id = Math.random().toString(36).substring(2, 9);
```

## Proposed Solutions

### Solution A: Use crypto.randomUUID
- **Description:** Replace Math.random() with crypto.randomUUID()
- **Pros:** Unique, secure
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Use crypto.randomUUID().

## Technical Details

**Affected Files:**
- `packages/ui/src/Toast.tsx`

## Acceptance Criteria

- [ ] Unique IDs always
- [ ] No collisions possible

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: UI Components
