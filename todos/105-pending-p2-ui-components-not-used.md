---
status: pending
priority: p2
issue_id: "105"
tags: [code-review, frontend, ui]
dependencies: []
---

# Pages Not Using Shared UI Components

## Problem Statement

Web app pages define their own inline UI components instead of using the shared `@fightrise/ui` package, violating CLAUDE.md guidelines.

**Why it matters:** Code duplication, inconsistent design, harder maintenance. The UI package exists specifically to avoid this.

## Findings

**Locations:**
- `apps/web/app/tournaments/page.tsx:21-84` - StatusBadge, TournamentCard, formatDate
- `apps/web/app/tournaments/[id]/page.tsx:38-217` - SectionCard, FormField, Toggle, Select, Input
- `apps/web/app/account/AccountClient.tsx:44-401` - SectionCard, StatCard, LinkedAccount, etc.

## Proposed Solutions

### Solution 1: Refactor to Use Shared Components (Recommended)

Move inline components to use existing @fightrise/ui components.

| Aspect | Assessment |
|--------|------------|
| Pros | Consistent UI, less code, easier maintenance |
| Cons | May need to extend UI components |
| Effort | Medium |
| Risk | Low |

### Solution 2: Add Missing Components to UI Package

Create missing components in packages/ui, then use them.

| Aspect | Assessment |
|--------|------------|
| Pros | Reusable across apps |
| Cons | More upfront work |
| Effort | Large |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/web/app/tournaments/page.tsx`
- `apps/web/app/tournaments/[id]/page.tsx`
- `apps/web/app/account/AccountClient.tsx`

## Acceptance Criteria

- [ ] Pages use @fightrise/ui components
- [ ] Inline component definitions removed
- [ ] Design consistent across app

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from web review | Found in web-code-reviewer agent |

## Resources

- CLAUDE.md frontend guidelines
- packages/ui/src/index.ts
