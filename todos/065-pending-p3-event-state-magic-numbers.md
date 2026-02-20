---
status: complete
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

- [x] EventState enum added to schema
- [x] Code uses enum values instead of magic numbers

## Resolution

The issue has been resolved:

1. **EventState enum** was added to `packages/database/prisma/schema.prisma` (lines 106-110):
   ```prisma
   enum EventState {
     CREATED
     ACTIVE
     COMPLETED
   }
   ```

2. **Event model** now uses the enum instead of an integer:
   ```prisma
   state           EventState @default(CREATED)
   ```

3. **tournamentService.ts** properly imports and uses `EventState`:
   - Imports: `import { ..., EventState, ... } from '@fightrise/database';`
   - Uses `parseEventState()` method to convert Start.gg API strings to enum values
   - All event state operations use enum values (e.g., `EventState.CREATED`, `EventState.ACTIVE`, `EventState.COMPLETED`)
