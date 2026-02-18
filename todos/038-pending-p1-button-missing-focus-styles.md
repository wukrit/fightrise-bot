---
status: ready
priority: p1
issue_id: "code-review"
tags: [code-review, accessibility, ui]
dependencies: []
---

# Button Missing Focus Styles

## Problem Statement

The Button component has no visible focus indicator for keyboard navigation. Keyboard users cannot see which element has focus.

**Why it matters:** Violates WCAG 2.1 Success Criterion 2.4.7 (Focus Visible). Keyboard users can't navigate effectively.

## Findings

**Location:** `packages/ui/src/Button.tsx:42-52`

```tsx
const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  // ... no :focus styles defined
};
```

## Proposed Solutions

### Solution A: Add focus styles
- **Description:** Add visible focus indicator to button styles
- **Pros:** WCAG compliant
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```tsx
const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  // ... base styles
};

const focusStyles: React.CSSProperties = {
  outline: '2px solid var(--color-primary)',
  outlineOffset: '2px',
};
```

## Recommended Action

**Solution A** - Add focus styles to button.

## Technical Details

**Affected Files:**
- `packages/ui/src/Button.tsx`

## Acceptance Criteria

- [x] Focus indicator visible on keyboard navigation
- [x] Consistent with design system

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Completed | Added focus styles using boxShadow |

## Resources

- Review: UI Components
