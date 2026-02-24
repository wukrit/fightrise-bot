---
status: complete
priority: p2
issue_id: "096"
tags: [code-review, ui, ssr]
dependencies: []
---

# PageGrid SSR Hydration Risk

## Problem Statement

The PageGrid component uses dynamic class names based on props which can cause React hydration mismatches between server and client when used in Next.js.

## Findings

### Evidence

**Location**: `packages/ui/src/PageWrapper.tsx:197-220`

```typescript
return (
  <>
    <style>
      {`
        .page-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: ${gapSizes[gap]};
        }
        @media (min-width: 768px) {
          .page-grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .page-grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .page-grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
        }
      `}
    </style>
    <div className={`page-grid page-grid-cols-${columns}`} {...props}>
      {children}
    </div>
  </>
);
```

Issues:
1. Dynamic class names (`page-grid-cols-${columns}`) based on props can cause hydration mismatch
2. The gap is duplicated - both in the `<style>` tag and should be in the JavaScript styles

### Risk Assessment

- **Severity**: 🟡 IMPORTANT (P2)
- **Impact**: React hydration warnings/errors in SSR frameworks like Next.js
- **Likelihood**: Medium - will occur when used in Next.js pages

## Proposed Solutions

### Solution A: Use CSS Variables (Recommended)

Use CSS custom properties for the column count instead of dynamic class names.

```typescript
return (
  <div
    className="page-grid"
    style={{
      '--columns': columns,
      ...gridStyles,
    } as React.CSSProperties}
  >
    <style>
      {`
        .page-grid {
          display: grid;
          grid-template-columns: repeat(var(--columns, 1), 1fr);
          gap: ${gapSizes[gap]};
        }
        @media (min-width: 768px) {
          .page-grid {
            grid-template-columns: repeat(min(var(--columns, 3), 3), 1fr);
          }
        }
      `}
    </style>
    {children}
  </div>
);
```

**Pros**: No dynamic class names, no hydration mismatch
**Cons**: More complex CSS
**Effort**: Medium
**Risk**: Low

### Solution B: Make Client-Only

Add `suppressHydrationWarning` or use a useEffect to set the class after mount.

**Pros**: Quick fix
**Cons**: Not ideal for SEO, flashes on load

## Recommended Action

**Solution A** - Refactor to use CSS variables.

## Technical Details

**Affected Files**:
- `packages/ui/src/PageWrapper.tsx`

## Acceptance Criteria

- [x] No dynamic class names based on props
- [x] Works correctly in SSR without hydration warnings
- [x] Gap is properly applied

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-24 | Created | Code review finding from PR #111 |
| 2026-02-24 | Completed | Fixed by team agents - refactored to use CSS variables |

## Resources

- Next.js hydration documentation
- React hydration best practices
