---
status: complete
priority: p2
issue_id: "031"
tags: [code-review, typescript, database, pr-64]
dependencies: []
---

# Type Erasure with Double Cast in Database Index

## Problem Statement

The database package uses `as unknown as PrismaClient` to cast the extended client back to PrismaClient. This erases the extension's type information and could hide type errors.

**Why it matters**: Type safety is important - the cast bypasses TypeScript's type checking.

## Findings

**Identified by**: architecture-strategist, kieran-typescript-reviewer

**Location**: `packages/database/src/index.ts:35-37`

**Evidence**:
```typescript
return basePrisma.$extends(
  createEncryptionExtension(encryptionKey, previousKey)
) as unknown as PrismaClient;
```

## Proposed Solutions

### Option A: Accept Cast with Documentation (Recommended)

Document why the cast is necessary and what consumers should know.

**Pros**: No code change, explains the tradeoff
**Cons**: Cast still exists
**Effort**: Minimal
**Risk**: Low

The cast is needed because:
1. Prisma's extended client has a different type than PrismaClient
2. All existing code expects PrismaClient
3. The extension only modifies User queries, not the type signature

### Option B: Export Extended Type

Create and export a proper type for the extended client.

**Pros**: Full type safety
**Cons**: Requires updating all consumers, complex types
**Effort**: Large (2+ hours)
**Risk**: Medium

```typescript
type ExtendedPrismaClient = ReturnType<typeof createEncryptedPrisma>;
export const prisma: ExtendedPrismaClient = ...;
```

### Option C: Use Declaration Merging

Extend PrismaClient type to include the encryption behavior.

**Pros**: Type-safe, no consumer changes
**Cons**: Complex TypeScript, may not accurately reflect runtime
**Effort**: Medium (1 hour)
**Risk**: Medium

## Recommended Action

Option A - Accept the cast with documentation. The extension doesn't change the API surface, only the behavior.

## Technical Details

**Affected files**:
- `packages/database/src/index.ts` (add comment)

## Acceptance Criteria

- [ ] Add comment explaining why cast is necessary
- [ ] Or implement proper typed export

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Prisma extensions and TypeScript have friction |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
- Prisma Extension Types: https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions/type-utilities
