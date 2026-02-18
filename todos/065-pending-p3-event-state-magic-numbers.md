---
status: pending
priority: p3
issue_id: "065"
tags: [code-review, type-safety, database]
dependencies: []
---

# Event State Uses Integer Magic Numbers

## Problem Statement

The Event model uses integer for state with magic numbers instead of an enum.

## Findings

**Location:** `packages/database/prisma/schema.prisma` line 116

```prisma
state           Int       @default(1)
```

## Proposed Solutions

### Solution A: Add EventState Enum
Add `enum EventState { CREATED, ACTIVE, COMPLETED }` to schema.

**Pros:** Type safety, self-documenting

**Effort:** Medium (requires migration)

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `packages/database/prisma/schema.prisma`
  - Event-related code in bot and web

## Acceptance Criteria

- [ ] EventState enum added to schema
- [ ] Code uses enum values instead of magic numbers
