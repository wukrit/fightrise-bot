---
status: complete
priority: p2
issue_id: "code-review"
tags: [code-review, accessibility, ui]
dependencies: []
---

# Form Labels Not Associated with Inputs

## Problem Statement

Labels are visually present but not programmatically associated with inputs using htmlFor/id. Clicking label doesn't focus input, screen readers can't associate them.

**Why it matters:** Accessibility violation, poor UX.

## Findings

**Location:** `packages/ui/src/Input.tsx:85`, `packages/ui/src/Select.tsx:95`, `packages/ui/src/Textarea.tsx:88`

```tsx
// Input.tsx
<label style={labelStyles}>{label}</label>
<input ... />
// Missing: id on input, htmlFor on label
```

## Proposed Solutions

### Solution A: Add id and htmlFor
- **Description:** Generate ID and use htmlFor
- **Pros:** Accessible
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Associate labels with inputs.

## Technical Details

**Affected Files:**
- `packages/ui/src/Input.tsx`
- `packages/ui/src/Select.tsx`
- `packages/ui/src/Textarea.tsx`

## Acceptance Criteria

- [x] Labels clickable
- [x] Screen reader association works

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-19 | Fixed | Added htmlFor/id using React.useId() |

## Resources

- Review: UI Components
