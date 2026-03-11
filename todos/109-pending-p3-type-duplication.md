---
status: pending
priority: p3
issue_id: "109"
tags: [code-review, types, web]
dependencies: []
---

# Type Duplication in Web App

## Problem Statement

Types are duplicated across multiple page files instead of being in the shared package.

**Why it matters:** Code duplication, inconsistency, harder to maintain.

## Findings

**Locations:**
- `apps/web/app/tournaments/page.tsx:6-18` - TournamentState, Tournament
- `apps/web/app/tournaments/[id]/page.tsx:7-35` - Duplicated interfaces
- `apps/web/app/dashboard/page.tsx:10-22` - Duplicated interfaces

## Proposed Solutions

### Solution 1: Move to Shared Package (Recommended)

Add common types to packages/shared/src/types.ts.

| Aspect | Assessment |
|--------|------------|
| Pros | Single source of truth |
| Cons | Need to update imports |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- Multiple page files in apps/web

## Acceptance Criteria

- [ ] Types in shared package
- [ ] Pages import from shared

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from web review | Found in web-code-reviewer agent |
