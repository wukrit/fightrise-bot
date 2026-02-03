---
status: pending
priority: p2
issue_id: "032"
tags: [code-review, quality, database, pr-64]
dependencies: []
---

# Mutation of Args in Prisma Extension

## Problem Statement

The encryption extension mutates the `args.data` object directly before passing to the query. This could cause issues if Prisma or other extensions expect immutable args.

**Why it matters**: Mutating input objects is an anti-pattern that can cause subtle bugs.

## Findings

**Identified by**: architecture-strategist, pattern-recognition-specialist

**Location**: `packages/database/src/extensions/encryption.ts`

**Evidence**:
```typescript
async create({ args, query }) {
  if (args.data.startggToken) {
    args.data.startggToken = encrypt(args.data.startggToken, encryptionKey);  // Mutation!
  }
  const result = await query(args);
  // ...
}
```

## Proposed Solutions

### Option A: Clone Args Before Mutation (Recommended)

Create a shallow copy of args.data before modifying.

**Pros**: No mutation side effects
**Cons**: Slightly more memory/CPU
**Effort**: Small (15 min)
**Risk**: Low

```typescript
async create({ args, query }) {
  const modifiedArgs = {
    ...args,
    data: {
      ...args.data,
      startggToken: args.data.startggToken
        ? encrypt(args.data.startggToken, encryptionKey)
        : args.data.startggToken,
    },
  };
  const result = await query(modifiedArgs);
  // ...
}
```

### Option B: Accept Mutation

Document that mutation is intentional and test that it works correctly.

**Pros**: No change, simpler code
**Cons**: Potential for subtle bugs
**Effort**: None
**Risk**: Low (Prisma seems to tolerate it)

## Recommended Action

Option A - Clone args before mutation. It's a small change that prevents potential issues.

## Technical Details

**Affected files**:
- `packages/database/src/extensions/encryption.ts`

**Operations to update**:
- create
- update
- upsert
- createMany

## Acceptance Criteria

- [ ] Args are cloned before modification
- [ ] Original args remain unmodified
- [ ] Tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-03 | Identified during PR #64 review | Avoid mutating input objects |

## Resources

- PR: https://github.com/wukrit/fightrise-bot/pull/64
