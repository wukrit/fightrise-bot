---
status: pending
priority: p2
issue_id: "093"
tags: [code-review, frontend, ui, radix]
dependencies: []
---

# Tooltip Uses Hardcoded Colors Instead of Design Tokens

## Problem Statement

The Tooltip component uses hardcoded hex values `#1a1a1a` and `#ffffff` instead of the design tokens from `tokens.ts`. This creates inconsistency with other UI components and makes theme changes difficult.

## Findings

**File:** `packages/ui/src/Tooltip.tsx`

- Line 42: `backgroundColor: '#1a1a1a'` - should use `tokens.colors.gray[800]` or similar
- Line 43: `color: '#ffffff'` - should use `tokens.colors.white`
- Line 53: `fill: '#1a1a1a'` - should use a token

**Evidence:**
```typescript
const contentStyles: React.CSSProperties = {
  // ...
  backgroundColor: '#1a1a1a',  // Hardcoded
  color: '#ffffff',              // Hardcoded
};

const arrowStyles: React.CSSProperties = {
  fill: '#1a1a1a',  // Hardcoded
};
```

## Proposed Solutions

### Option 1: Use Design Tokens (Recommended)
Replace hardcoded values with tokens:
```typescript
backgroundColor: tokens.colors.gray[800],
color: tokens.colors.white,
fill: tokens.colors.gray[800],
```

**Pros:** Consistent with other components, themeable
**Cons:** May need to verify gray[800] matches exact shade
**Effort:** Small
**Risk:** Low

### Option 2: Add Token Variables
Add custom CSS variables in tokens for tooltip-specific colors:
```typescript
// In tokens.ts
'--tooltip-bg': colors.gray[800],
'--tooltip-text': colors.white,
```

**Pros:** Easy to override per-theme
**Cons:** More changes needed
**Effort:** Medium
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

- **Affected files:** `packages/ui/src/Tooltip.tsx`
- **Components:** Tooltip
- **Database changes:** None

## Acceptance Criteria

- [ ] Tooltip uses design tokens for all colors
- [ ] No hardcoded hex values in Tooltip styles

## Work Log

- 2026-02-24: Created during code review of PR #112

## Resources

- PR #112: refactor(ui): migrate to Radix UI primitives
