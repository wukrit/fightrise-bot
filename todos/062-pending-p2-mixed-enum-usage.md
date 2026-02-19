---
status: complete
priority: p2
issue_id: "062"
tags: [code-review, type-safety]
dependencies: []
---

# Mixed Enum Usage in Match State

## Problem Statement

The web API route imports MatchState enum but uses string literals instead.

## Findings

**Location:** `apps/web/app/api/matches/[id]/report/route.ts`

Imports enum but uses strings:
```typescript
import { MatchState } from '@fightrise/database'; // imported but not used
data: { state: 'COMPLETED' }   // uses string
data: { state: 'DISPUTED' }   // uses string
```

## Proposed Solutions

### Solution A: Use Imported Enum Values (Recommended)
Replace strings with `MatchState.COMPLETED`, `MatchState.DISPUTED`.

**Pros:** Type safety, consistent

**Effort:** Small

## Recommended Action

<!-- To be filled during triage -->

## Technical Details

- **Affected Files:**
  - `apps/web/app/api/matches/[id]/report/route.ts`
  - `apps/web/app/api/matches/[id]/dispute/route.ts`
  - `apps/web/app/api/matches/[id]/confirm/route.ts`

## Acceptance Criteria

- [x] Uses MatchState enum values instead of strings
- [x] Type safety improved
