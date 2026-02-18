---
status: ready
priority: p2
issue_id: "code-review"
tags: [code-review, ui, ssr]
dependencies: []
---

# ThemeProvider SSR Hydration Issue

## Problem Statement

Accesses localStorage and window.matchMedia in useEffect, but doesn't handle hydration mismatch. Initial render uses defaultTheme, then switches after hydration.

**Why it matters:** Hydration errors in Next.js.

## Findings

**Location:** `packages/ui/src/ThemeProvider.tsx:31-38`

```tsx
React.useEffect(() => {
  const stored = localStorage.getItem('theme') as Theme | null;
  // ...
}, []);
```

## Proposed Solutions

### Solution A: Add hydration handling
- **Description:** Use useState to track mounted, only render theme after mount
- **Pros:** No hydration mismatch
- **Cons:** Slight delay
- **Effort:** Small
- **Risk:** Low

## Recommended Action

**Solution A** - Handle SSR hydration properly.

## Technical Details

**Affected Files:**
- `packages/ui/src/ThemeProvider.tsx`

## Acceptance Criteria

- [ ] No hydration errors
- [ ] Consistent render

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during code review |

## Resources

- Review: UI Components
