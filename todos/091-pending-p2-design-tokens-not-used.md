---
status: complete
priority: p2
issue_id: "091"
tags: [code-review, ui, performance]
dependencies: []
---

# Design Tokens Not Used in Components

## Problem Statement

UI components have hardcoded color and spacing values instead of using the design tokens from `packages/ui/src/tokens.ts`.

## Findings

### Evidence

**Location**: `packages/ui/src/Button.tsx:9-26`

```typescript
const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: '#3b82f6',  // Hardcoded
    color: 'white',
  },
```

Should use `tokens.colors.primary`.

### Risk Assessment

- **Severity**: 🟡 IMPORTANT
- **Impact**: Inconsistent theming, harder updates
- **Likelihood**: High

## Proposed Solutions

### Solution A: Use Design Tokens (Recommended)
```typescript
import { tokens } from './tokens.js';

const variantStyles = {
  primary: {
    backgroundColor: tokens.colors.primary,
    // ...
  },
};
```

**Pros**: Consistent theming, easy updates
**Cons**: None
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Replace hardcoded values with design tokens from tokens.ts.

## Technical Details

**Affected Files**:
- `packages/ui/src/Button.tsx`
- `packages/ui/src/Input.tsx`
- `packages/ui/src/Select.tsx`
- `packages/ui/src/Modal.tsx`
- `packages/ui/src/Drawer.tsx`

## Acceptance Criteria

- [x] Button uses design tokens
- [x] Input uses design tokens
- [x] Modal uses design tokens

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Completed | Replaced hardcoded values with design tokens in Button, Input, Select, Modal, Drawer, and Textarea components. Added border color token and combined tokens export. |

## Resources

- `packages/ui/src/tokens.ts`
