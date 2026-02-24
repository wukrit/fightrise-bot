---
status: pending
priority: p2
issue_id: "094"
tags: [code-review, frontend, ui, radix]
dependencies: []
---

# Select Focus State Dead Code

## Problem Statement

The Select component's `getTriggerStyle` function accepts an `isFocused` parameter that is always passed as `false`, making the focus styles branch dead code. This is misleading and adds unnecessary complexity.

## Findings

**File:** `packages/ui/src/Select.tsx`

- Lines 147-161: `getTriggerStyle` function accepts `isFocused` but...
- Line 175: ...is always called with `false`: `style={getTriggerStyle(false, style)}`

**Evidence:**
```typescript
const getTriggerStyle = (isFocused: boolean, customStyle?: React.CSSProperties): React.CSSProperties => {
  let style = { ...triggerStyles };
  if (error) {
    Object.assign(style, triggerErrorStyles);
  } else if (isFocused) {  // This branch is NEVER taken!
    Object.assign(style, triggerFocusStyles);
  }
  // ...
};
```

## Proposed Solutions

### Option 1: Remove Unused Focus Branch
Remove the focus style logic since it's never used:
```typescript
const getTriggerStyle = (customStyle?: React.CSSProperties): React.CSSProperties => {
  let style = { ...triggerStyles };
  if (error) {
    Object.assign(style, triggerErrorStyles);
  }
  if (customStyle) {
    Object.assign(style, customStyle);
  }
  return style;
};
```

**Pros:** Simplifies code, removes dead code
**Cons:** May need focus styles in the future
**Effort:** Small
**Risk:** Low

### Option 2: Add Proper Focus Handling
Use Radix's built-in focus state instead of manual tracking:
```typescript
// Radix Select handles focus internally via data attributes
// Style with CSS: select[data-state="focused"] { ... }
```

**Pros:** Uses Radix properly
**Cons:** Requires CSS changes
**Effort:** Medium
**Risk:** Low

## Recommended Action

[To be filled during triage]

## Technical Details

- **Affected files:** `packages/ui/src/Select.tsx`
- **Components:** Select
- **Database changes:** None

## Acceptance Criteria

- [ ] Focus styles are either properly used or removed
- [ ] No dead code in getTriggerStyle function

## Work Log

- 2026-02-24: Created during code review of PR #112

## Resources

- PR #112: refactor(ui): migrate to Radix UI primitives
