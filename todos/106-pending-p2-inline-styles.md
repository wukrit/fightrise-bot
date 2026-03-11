---
status: pending
priority: p2
issue_id: "106"
tags: [code-review, frontend, styling]
dependencies: []
---

# Inline Styles Mixed with Tailwind

## Problem Statement

Despite using Tailwind CSS, pages have inline `style={{...}}` props that bypass the design system.

**Why it matters:** Inconsistent styling, harder to maintain, bypasses theme system.

## Findings

**Locations:**
- `apps/web/app/account/AccountClient.tsx:53,76,127,138,267,293,392,527,535`
- `apps/web/app/tournaments/[id]/page.tsx:510-517`

**Example:**
```typescript
<Card style={{ backgroundColor: 'rgba(24, 24, 27, 0.3)', border: '1px solid rgba(63, 63, 70, 0.5)', borderRadius: '12px', padding: '24px' }}>
```

## Proposed Solutions

### Solution 1: Convert to Tailwind Classes (Recommended)

Replace inline styles with Tailwind classes.

| Aspect | Assessment |
|--------|------------|
| Pros | Consistent with design system |
| Cons | May need custom Tailwind config |
| Effort | Medium |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/web/app/account/AccountClient.tsx`
- `apps/web/app/tournaments/[id]/page.tsx`

## Acceptance Criteria

- [ ] No inline style props
- [ ] All styling via Tailwind or design tokens

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from web review | Found in web-code-reviewer agent |
