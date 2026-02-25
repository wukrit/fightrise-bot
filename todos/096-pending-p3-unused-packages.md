---
status: pending
priority: p3
issue_id: "096"
tags: [code-review, frontend, ui, radix, bundle-size]
dependencies: []
---

# Unused Radix UI Packages Added

## Problem Statement

The PR adds `@radix-ui/react-toast` and `@radix-ui/react-dropdown-menu` packages but no Toast or DropdownMenu components were created or used. These add unnecessary bundle size.

## Findings

**File:** `packages/ui/package.json`

Added packages:
- `@radix-ui/react-toast` - ^1.2.0
- `@radix-ui/react-dropdown-menu` - ^2.1.0

Neither package is imported or used in any component.

## Proposed Solutions

### Option 1: Remove Unused Packages
Remove the packages that aren't being used:
```bash
npm uninstall @radix-ui/react-toast @radix-ui/react-dropdown-menu
```

**Pros:** Reduces bundle size by ~50-75KB
**Cons:** If needed later, would need to re-add
**Effort:** Small
**Risk:** Low

### Option 2: Keep for Future Use
Keep packages "for future use" per the PR plan.

**Pros:** No re-installation needed later
**Cons:** Adds unnecessary bundle size now, violates YAGNI
**Effort:** None
**Risk:** Medium (bundle bloat)

## Recommended Action

[To be filled during triage]

## Technical Details

- **Affected files:** `packages/ui/package.json`
- **Components:** None using these
- **Database changes:** None

## Acceptance Criteria

- [ ] Unused packages removed OR
- [ ] Documented why packages are needed for future use

## Work Log

- 2026-02-24: Created during code review of PR #112

## Resources

- PR #112: refactor(ui): migrate to Radix UI primitives
