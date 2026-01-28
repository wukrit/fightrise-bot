---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, typescript, quality]
dependencies: []
---

# Type Safety Violations in pollingService.ts

## Problem Statement

Several locations in the polling service use unsafe type assertions or lack proper type narrowing, which could lead to runtime errors if the Start.gg API returns unexpected data.

**Why it matters:** TypeScript's type safety is bypassed, potentially causing silent failures or runtime crashes that are hard to debug.

## Findings

**Location 1:** `apps/bot/src/services/pollingService.ts:231`

```typescript
if ((error as { code?: string }).code === 'P2002') {
```

Unsafe type assertion - should use proper type guard.

**Location 2:** `apps/bot/src/services/pollingService.ts:255`

```typescript
data: { reportedScore: score1 as number, isWinner: (score1 as number) > (score2 as number) },
```

Type assertions after null checks are correct but could be cleaner.

**Evidence from Kieran TypeScript Reviewer:**
- Identified as critical type safety issue
- Recommendation: Create proper type guards or use Prisma's error types

## Proposed Solutions

### Solution 1: Prisma Error Type Guard (Recommended)

Create a type guard for Prisma errors.

```typescript
import { Prisma } from '@fightrise/database';

function isPrismaUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// Usage
} catch (error) {
  if (isPrismaUniqueConstraintError(error)) {
    return result;
  }
  throw error;
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | Type-safe, reusable, self-documenting |
| Cons | Adds a helper function |
| Effort | Small |
| Risk | Low |

### Solution 2: Direct Prisma Type Check

Use instanceof with Prisma's exported error class.

```typescript
import { Prisma } from '@fightrise/database';

} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return result;
  }
  throw error;
}
```

| Aspect | Assessment |
|--------|------------|
| Pros | No helper needed, still type-safe |
| Cons | Longer inline check |
| Effort | Small |
| Risk | Low |

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `apps/bot/src/services/pollingService.ts`

## Acceptance Criteria

- [ ] Prisma error handling uses proper type guards or instanceof checks
- [ ] No `as { code?: string }` type assertions remain
- [ ] TypeScript compilation passes with strict mode
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created from code review | Kieran identified unsafe assertions |
| 2026-01-28 | Fixed: Used Prisma.PrismaClientKnownRequestError instanceof check | Type-safe error handling with Prisma's exported types |

## Resources

- Prisma error handling docs: https://www.prisma.io/docs/concepts/components/prisma-client/handling-errors
- PR #52
