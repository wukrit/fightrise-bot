---
status: complete
priority: p3
issue_id: "079"
tags: [code-review, typescript, quality]
dependencies: []
---

# Redundant Type Assertions in Polling Service

## Problem Statement

Type assertions after already validating with typeof are redundant.

**Why it matters:** Code clarity - unnecessary assertions indicate confusion.

## Findings

**Location:** `apps/bot/src/services/pollingService.ts` (lines 343, 347)

Current code:
```typescript
data: { reportedScore: score1 as number, isWinner: (score1 as number) > (score2 as number) },
```

Since `score1` and `score2` are validated as numbers with typeof on line 332, the `as number` is redundant.

## Proposed Solutions

### Solution A: Remove Redundant Assertions (Recommended)
- **Description:** Use validated variables instead
- **Pros:** Cleaner code
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
const validScore1 = typeof score1 === 'number' ? score1 : 0;
const validScore2 = typeof score2 === 'number' ? score2 : 0;

data: { reportedScore: validScore1, isWinner: validScore1 > validScore2 },
```

## Recommended Action

Solution A - Remove redundant assertions.

## Technical Details

**Affected Files:**
- `apps/bot/src/services/pollingService.ts`

## Acceptance Criteria

- [ ] No redundant as number assertions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
