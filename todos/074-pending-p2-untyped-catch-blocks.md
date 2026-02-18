---
status: complete
priority: p2
issue_id: "074"
tags: [code-review, typescript, quality]
dependencies: []
---

# Untyped Catch Blocks in API Routes

## Problem Statement

Catch blocks use untyped `error` parameter. Should be typed as `unknown` first for proper type safety.

**Why it matters:** Type safety - untyped errors can leak any type into the catch block.

## Findings

**Locations:**
- `apps/web/app/api/matches/[id]/dq/route.ts` (line 138)
- `apps/web/app/api/matches/[id]/report/route.ts` (line 175)
- `apps/web/app/api/tournaments/[id]/admin/register/route.ts` (line 116)
- `apps/web/app/api/tournaments/[id]/admin/registrations/route.ts` (line 91)

Current code:
```typescript
} catch (error) {
  console.error('DQ error:', error);
```

## Proposed Solutions

### Solution A: Type as unknown (Recommended)
- **Description:** Type catch parameter as unknown first
- **Pros:** Proper TypeScript pattern
- **Cons:** None
- **Effort:** Small
- **Risk:** Low

```typescript
} catch (error: unknown) {
  console.error('DQ error:', error);
```

## Recommended Action

Solution A - Add unknown type annotation.

## Technical Details

**Affected Files:**
- 4 API route files

## Acceptance Criteria

- [ ] All catch blocks typed as unknown

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-18 | Created | Found during PR #97 review |

## Resources

- PR: #97
