---
status: complete
priority: p1
issue_id: "102"
tags: [code-review, accessibility, ui]
dependencies: []
---

# Button Component Missing Accessibility

## Problem Statement

The Button component in the UI package lacks proper focus indicators and ARIA attributes, violating WCAG accessibility guidelines.

**Why it matters:** Users with disabilities rely on keyboard navigation and screen readers. Missing focus styles and ARIA attributes make the app unusable for them.

## Findings

**Location:** `packages/ui/src/Button.tsx:56`

```typescript
// Focus is removed entirely - violates WCAG
outline: 'none'
```

**Location:** `packages/ui/src/Button.tsx:59-70`

Missing `aria-busy` attribute when loading.

## Proposed Solutions

### Solution 1: Add Focus Visible Styles (Recommended)

Add `:focus-visible` styles with visible outline.

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | WCAG compliant, maintains good UX |
| Cons | None |
| Effort | Small |
| Risk | None |

### Solution 2: Add ARIA Attributes

Add `aria-busy`, `aria-disabled` attributes.

| Aspect | Assessment |
|--------|------------|
| Pros | Screen reader support |
| Cons | None |
| Effort | Small |
| Risk | None |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `packages/ui/src/Button.tsx`

## Acceptance Criteria

- [ ] Add focus-visible styles to Button
- [ ] Add aria-busy when loading
- [ ] Test keyboard navigation works

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-11 | Verified already fixed | Code reviewed - issue no longer present |
| 2026-03-10 | Created from packages review | Found in database-packages-review agent |

## Resources

- WCAG 2.1 Success Criterion 2.4.7
- Radix UI Button accessibility
