---
status: ready
priority: p1
issue_id: "code-review"
tags: [code-review, accessibility, ui]
dependencies: []
---

# Modal/Drawer Missing Focus Trap

## Problem Statement

Both Modal and Drawer components lack focus trapping (keeping focus within the dialog) and Escape key handling. This is a severe accessibility violation.

**Why it matters:** Users with screen readers and keyboard-only users cannot properly exit modals. Pressing Escape is a universal convention that doesn't work. WCAG 2.1 violation.

## Findings

**Location:** `packages/ui/src/Modal.tsx:90-129`, `packages/ui/src/Drawer.tsx:99-139`

```tsx
// Modal.tsx - No escape key handler
export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    // Missing: keydown listener for Escape
    // Missing: focus trap
  }, [isOpen]);
```

## Proposed Solutions

### Solution A: Add focus trap and escape handling
- **Description:** Implement focus trap and escape key handler
- **Pros:** WCAG compliant
- **Cons:** Additional code
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

**Solution A** - Add focus trap and escape handling.

## Technical Details

**Affected Files:**
- `packages/ui/src/Modal.tsx`
- `packages/ui/src/Drawer.tsx`

## Acceptance Criteria

- [x] Escape key closes modal/drawer
- [x] Focus trapped within dialog
- [x] Focus returns to trigger on close

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |
| 2026-02-18 | Completed | Added focus trap and escape key handling to Modal and Drawer |

## Resources

- Review: UI Components
