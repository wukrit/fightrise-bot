---
status: pending
priority: p3
issue_id: "097"
tags: [code-review, frontend, ui, radix]
dependencies: []
---

# Unused CSS Variables in Tokens

## Problem Statement

The PR adds 63 CSS variables (`cssVariables`) and exports `colorsDark` but neither are used by any component. All components use inline styles with token values directly.

## Findings

**File:** `packages/ui/src/tokens.ts`

- Lines 123-185: `cssVariables` - 63 unused CSS custom properties
- Lines 112-119: `colorsDark` - exported but never imported/used

**Evidence:**
```typescript
export const cssVariables = {
  '--color-primary': colors.primary,
  // ... 61 more
} as const;

export const colorsDark = {
  ...colors,
  background: '#1f2937',
  // ...
} as const;
```

No component imports or uses these:
- All components use inline styles: `backgroundColor: tokens.colors.primary`
- No CSS variable-based styling found in any migrated component

## Proposed Solutions

### Option 1: Remove Unused Code
Remove the unused exports:
```typescript
// Remove colorsDark
// Remove cssVariables from tokens export
```

**Pros:** Reduces code, cleaner API
**Cons:** If needed later, would need to re-add
**Effort:** Small
**Risk:** Low

### Option 2: Keep for Future Migration
Keep for potential future migration to CSS variable-based styling.

**Pros:** Available for future use
**Cons:** Dead code now, confuses API consumers
**Effort:** None
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

- **Affected files:** `packages/ui/src/tokens.ts`
- **Components:** All UI components
- **Database changes:** None

## Acceptance Criteria

- [ ] Unused CSS variables removed OR
- [ ] Documented plan to use them

## Work Log

- 2026-02-24: Created during code review of PR #112

## Resources

- PR #112: refactor(ui): migrate to Radix UI primitives
