---
status: complete
priority: p1
issue_id: "094"
tags: [code-review, ui, bug]
dependencies: []
---

# Form.tsx Incorrect noValidate Logic

## Problem Statement

The Form component's `handleSubmit` function incorrectly calls `e.preventDefault()` when `noValidate` is true, which would prevent the form from ever submitting natively. The `noValidate` prop already disables browser validation when passed to the form element.

## Findings

### Evidence

**Location**: `packages/ui/src/Form.tsx:25-27`

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  if (noValidate) {
    e.preventDefault();  // WRONG: This breaks form behavior
  }
  // ...
};
```

The form element already receives the noValidate prop correctly on line 37:
```typescript
<form
  style={{ ...formStyles, ...style }}
  onSubmit={handleSubmit}
  noValidate={noValidate}
  {...props}
>
```

### Risk Assessment

- **Severity**: 🔴 CRITICAL (P1)
- **Impact**: Forms with noValidate will never submit
- **Likelihood**: High - affects any form using noValidate

## Proposed Solutions

### Solution A: Remove Incorrect Code (Recommended)

Remove lines 25-27 entirely. The `noValidate` prop on the form element is sufficient to disable browser validation.

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  if (onSubmit) {
    await onSubmit(e);
  }
};
```

**Pros**: Fixes the bug, simplifies code
**Cons**: None
**Effort**: Small (remove 3 lines)
**Risk**: Very Low

## Recommended Action

**Solution A** - Remove the incorrect noValidate handling code.

## Technical Details

**Affected Files**:
- `packages/ui/src/Form.tsx`

## Acceptance Criteria

- [x] Remove the incorrect e.preventDefault() call in handleSubmit
- [x] Verify forms still work correctly with and without noValidate

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-24 | Created | Code review finding from PR #111 |
| 2026-02-24 | Completed | Fixed by team agents - removed incorrect preventDefault call |

## Resources

- React Form documentation - noValidate prop
