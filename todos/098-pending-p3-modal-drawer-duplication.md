---
status: pending
priority: p3
issue_id: "098"
tags: [code-review, frontend, ui, radix, duplication]
dependencies: []
---

# Modal and Drawer Code Duplication

## Problem Statement

Modal and Drawer components share ~60% duplicated code including identical overlay styles, close buttons, headers, titles, content, and footer styles. This violates DRY principle.

## Findings

**Files:** `packages/ui/src/Modal.tsx`, `packages/ui/src/Drawer.tsx`

Duplicated elements:
1. **CloseIcon component** - Identical in both files
2. **overlayStyles** - Nearly identical (only padding differs)
3. **closeButtonStyles** - Identical
4. **headerStyles** - Identical
5. **titleStyles** - Identical
6. **contentStyles** - Similar
7. **footerStyles** - Identical

**Evidence:**
```typescript
// Modal.tsx:77-84
function CloseIcon() { /* ... */ }

// Drawer.tsx:89-96
function CloseIcon() { /* ... */ }  // Identical!

// Modal.tsx:13-20
const overlayStyles = { position: 'fixed', inset: 0, ... };

// Drawer.tsx:14-20
const overlayStyles = { position: 'fixed', inset: 0, ... };  // Identical!
```

## Proposed Solutions

### Option 1: Create Shared Dialog Module
Extract common styles to a shared module:
```typescript
// packages/ui/src/styles/dialogShared.ts
export const overlayStyles = { ... };
export const headerStyles = { ... };
export const CloseIcon = () => { ... };
```

**Pros:** Eliminates duplication, DRY
**Cons:** Additional file, more abstraction
**Effort:** Medium
**Risk:** Low

### Option 2: Create Dialog Base Component
Create a base Dialog component that Modal and Drawer extend:
```typescript
// packages/ui/src/Dialog.tsx
export function Dialog({ variant, ...props }) { ... }
export const Modal = (props) => <Dialog variant="modal" {...props} />;
export const Drawer = (props) => <Dialog variant="drawer" {...props} />;
```

**Pros:** Maximum code sharing
**Cons:** More complex, harder to customize
**Effort:** Large
**Risk:** Medium

### Option 3: Accept Duplication
Keep as-is for now, simplify now, refactor later if needed.

**Pros:** No immediate work
**Cons:** Technical debt
**Effort:** None
**Risk:** Low (works fine)

## Recommended Action

[To be filled during triage]

## Technical Details

- **Affected files:** `packages/ui/src/Modal.tsx`, `packages/ui/src/Drawer.tsx`
- **Components:** Modal, Drawer
- **Database changes:** None

## Acceptance Criteria

- [ ] Duplication eliminated via shared module OR
- [ ] Documented as acceptable technical debt

## Work Log

- 2026-02-24: Created during code review of PR #112

## Resources

- PR #112: refactor(ui): migrate to Radix UI primitives
