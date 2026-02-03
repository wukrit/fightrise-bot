---
status: complete
priority: p2
issue_id: "027"
tags: [code-review, database, pr-64]
dependencies: []
---

# Decryption for Related Queries (include) Not Fully Handled

## Problem Statement

When querying other models with `include: { user: true }`, the included User's `startggToken` may not be decrypted because the extension only hooks into User model operations, not the parent query.

**Why it matters**: Inconsistent behavior - tokens are decrypted in some queries but not others.

## Findings

**Identified by**: data-integrity-guardian, architecture-strategist

**Location**: `packages/database/src/extensions/encryption.ts`

**Evidence**:
```typescript
// This works - direct User query
const user = await prisma.user.findUnique({ where: { id: 1 } });
// user.startggToken is decrypted ✓

// This may not work - included via parent
const match = await prisma.match.findUnique({
  where: { id: 1 },
  include: { players: { include: { user: true } } }
});
// match.players[0].user.startggToken may still be encrypted ✗
```

## Proposed Solutions

### Option A: Document Limitation (Recommended)

Document that tokens should only be accessed via direct User queries, not includes.

**Pros**: Simple, clear guidance
**Cons**: Doesn't solve the underlying issue
**Effort**: Minimal
**Risk**: Low

### Option B: Add Hooks to Related Models

Hook into MatchPlayer, Registration, etc. to decrypt included users.

**Pros**: Consistent behavior everywhere
**Cons**: Complex, many hooks, easy to miss new relations
**Effort**: Large (2+ hours)
**Risk**: Medium

### Option C: Post-Process Results

Create a utility function that recursively decrypts tokens in nested results.

**Pros**: Can be applied anywhere needed
**Cons**: Manual, easy to forget
**Effort**: Medium (1 hour)
**Risk**: Low

## Recommended Action

Option A - Document the limitation. In practice, direct User queries should be used when the token is needed.

## Technical Details

**Affected files**:
- `packages/database/README.md` or inline comments

**Note**: Verify if this is actually an issue by testing include behavior with Prisma extensions.

## Acceptance Criteria

- [ ] Document when tokens are/aren't decrypted
- [ ] Or implement comprehensive decryption for includes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Prisma extensions scope to model, not relations |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
- Prisma Extensions: https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions
