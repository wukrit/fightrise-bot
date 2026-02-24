---
status: complete
priority: p1
issue_id: "093"
tags: [code-review, ui, consistency]
dependencies: []
---

# Design Tokens Not Used in New UI Components

## Problem Statement

PR #111 added new UI components (Form.tsx, PageWrapper.tsx) that use hardcoded CSS values instead of the design tokens system that the entire existing codebase uses. This breaks consistency with the existing 20+ components in the UI package.

## Findings

### Evidence

**Location**: `packages/ui/src/Form.tsx`

```typescript
// Lines 11-15 - hardcoded values
const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',  // Should use tokens.spacing.md
};

// Lines 65-67 - hardcoded values
const labelStyles: React.CSSProperties = {
  fontSize: '14px',  // Should use tokens.typography.fontSize.sm
  fontWeight: 500,   // Should use tokens.typography.fontWeight.medium
  color: 'var(--color-text, #1a1a1a)',  // Should use tokens.colors.gray[900]
};
```

**Location**: `packages/ui/src/PageWrapper.tsx`

```typescript
// Lines 46-49 - hardcoded values
const titleStyles: React.CSSProperties = {
  fontSize: '28px',  // Should use tokens.typography.fontSize['2xl']
  fontWeight: 700,   // Should use tokens.typography.fontWeight.bold
};
```

**Existing correct pattern** from `Button.tsx`:
```typescript
import { tokens } from './tokens.js';

const sizeStyles = {
  sm: {
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    fontSize: tokens.typography.fontSize.sm,
  },
};
```

### Risk Assessment

- **Severity**: 🔴 CRITICAL (P1)
- **Impact**: Inconsistent theming across UI components, harder to maintain design system
- **Likelihood**: High - all new components affected

## Proposed Solutions

### Solution A: Use Design Tokens (Recommended)

Import and use `tokens` from `./tokens.js` in all new components.

```typescript
import { tokens } from './tokens.js';

const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,  // Changed from '16px'
};
```

**Pros**: Consistent with existing code, easy theme updates
**Cons**: None
**Effort**: Small (replace ~20 hardcoded values)
**Risk**: Very Low

## Recommended Action

**Solution A** - Replace all hardcoded CSS values with design tokens.

## Technical Details

**Affected Files**:
- `packages/ui/src/Form.tsx`
- `packages/ui/src/PageWrapper.tsx`

## Acceptance Criteria

- [x] Form.tsx imports and uses tokens
- [x] PageWrapper.tsx imports and uses tokens
- [x] All hardcoded color/spacing/font values replaced with tokens

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-24 | Created | Code review finding from PR #111 |
| 2026-02-24 | Completed | Fixed by team agents - imported tokens and replaced hardcoded values |

## Resources

- `packages/ui/src/tokens.ts` - Design tokens
- `packages/ui/src/Button.tsx` - Example of correct token usage
