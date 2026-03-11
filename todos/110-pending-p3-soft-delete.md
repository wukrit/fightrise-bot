---
status: pending
priority: p3
issue_id: "110"
tags: [code-review, database, schema]
dependencies: []
---

# Missing Soft Delete Support in Database

## Problem Statement

Database models lack soft delete support (deletedAt fields), making data recovery impossible.

**Why it matters:** Accidental deletions can't be recovered, audit trail incomplete.

## Findings

**Location:** `packages/database/prisma/schema.prisma`

A TODO comment indicates soft delete is needed but not implemented.

## Proposed Solutions

### Solution 1: Add deletedAt to Key Models

Add `deletedAt DateTime?` to User, Tournament, Match, Registration models.

| Aspect | Assessment |
|--------|------------|
| Pros | Data recovery possible |
| Cons | Schema migration needed |
| Effort | Medium |
| Risk | Medium |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `packages/database/prisma/schema.prisma`

## Acceptance Criteria

- [ ] deletedAt added to key models
- [ ] Queries filter out deleted records

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-10 | Created from packages review | Found in database-packages-review agent |
