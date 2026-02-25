---
status: pending
priority: p2
issue_id: "095"
tags: [code-review, frontend, ui, radix]
dependencies: []
---

# Button Manual Focus State Over-Engineering

## Problem Statement

The Button component uses React `useState` to track focus state, which is unnecessary since native HTML buttons handle focus automatically via CSS `:focus` pseudo-class. This adds complexity without benefit.

## Findings

**File:** `packages/ui/src/Button.tsx`

- Line 75: `const [isFocused, setIsFocused] = React.useState(false);`
- Lines 78-86: `handleFocus` and `handleBlur` manually manage focus state
- Line 95: Focus styles applied based on React state, not CSS

**Evidence:**
```typescript
const [isFocused, setIsFocused] = React.useState(false);

const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
  setIsFocused(true);
  onFocus?.(e);
};

const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
  setIsFocused(false);
  onBlur?.(e);
};

// Style applied via React state instead of CSS
...(isFocused ? focusStyles : {}),
```

## Proposed Solutions

### Option 1: Use CSS Focus Instead (Recommended)
Remove React focus state and use CSS:
```typescript
// In button styles:
':focus': focusStyles,
':focus-visible': focusStyles,
```

**Pros:** Simpler, more performant, proper browser behavior
**Cons:** Requires CSS (not inline styles)
**Effort:** Small
**Risk:** Low

### Option 2: Keep Current Pattern
Keep the current implementation for some reason (e.g., if inline focus styles are needed).

**Pros:** Works with inline styles
**Cons:** Over-engineered, React state overhead
**Effort:** None
**Risk:** N/A

## Recommended Action

[To be filled during triage]

## Technical Details

- **Affected files:** `packages/ui/src/Button.tsx`
- **Components:** Button
- **Database changes:** None

## Acceptance Criteria

- [ ] Button uses CSS focus instead of React state
- [ ] Simpler focus handling implementation

## Work Log

- 2026-02-24: Created during code review of PR #112

## Resources

- PR #112: refactor(ui): migrate to Radix UI primitives
