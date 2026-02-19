---
status: complete
priority: p2
issue_id: "089"
tags: [code-review, web, architecture]
dependencies: []
---

# Not Using Shared UI Components

## Problem Statement

Pages in the web app create custom inline components instead of using the shared UI components from `packages/ui/`. This leads to inconsistency and code duplication.

## Findings

### Evidence

**Location**: Multiple pages in `apps/web/app/`

Shared UI components exist but aren't used:
- `packages/ui/src/Button.tsx`
- `packages/ui/src/Input.tsx`
- `packages/ui/src/Select.tsx`
- `packages/ui/src/Card.tsx`
- `packages/ui/src/Toggle.tsx`

Pages create inline components instead.

### Risk Assessment

- **Severity**: 🟡 IMPORTANT
- **Impact**: Inconsistent UI, maintenance burden
- **Likelihood**: High

## Proposed Solutions

### Solution A: Use Shared Components (Recommended)
Replace inline components with imports:

```typescript
import { Button, Input, Card } from '@fightrise/ui';

export default function Page() {
  return (
    <Card>
      <Input placeholder="Search..." />
      <Button>Submit</Button>
    </Card>
  );
}
```

**Pros**: Consistency, shared maintenance
**Cons**: May need prop adjustments
**Effort**: Medium
**Risk**: Low

## Recommended Action

**Solution A** - Replace inline components with shared UI package imports.

## Technical Details

**Affected Files**:
- `apps/web/app/account/AccountClient.tsx` - Replaced SectionCard, StatCard, buttons, selects
- `apps/web/app/auth/signin/page.tsx` - Replaced inline div with Card
- `apps/web/app/auth/error/page.tsx` - Replaced inline div with Card and button with Button
- `apps/web/app/auth/success/page.tsx` - Replaced inline div with Card and button with Button

## Acceptance Criteria

- [x] All pages use shared Button component
- [x] All pages use shared Input component (where applicable)
- [x] All pages use shared Card component
- [x] All pages use shared Select component (where applicable)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Resolved | Replaced inline components with shared UI package imports |

## Resolution Summary

Updated the following pages to use shared UI components from `@fightrise/ui`:
- Account page (AccountClient.tsx): SectionCard, StatCard, buttons, selects
- Sign in page: Card component
- Auth error page: Card and Button components
- Auth success page: Card and Button components

Used inline style overrides to maintain dark mode theme compatibility.

## Resources

- [Shared UI Components](packages/ui/src/index.ts)
