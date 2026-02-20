---
status: complete
priority: p1
issue_id: "081"
tags: [code-review, bot, data-integrity]
dependencies: []
---

# Race Condition in Button Handlers (No Transactions)

## Problem Statement

The registration approve/reject handlers in `apps/bot/src/handlers/registration.ts` do not use database transactions. Between checking admin permissions and updating the registration, another request could change state, leading to race conditions and potential data inconsistency.

## Findings

### Evidence

**Location**: `apps/bot/src/handlers/registration.ts:32-67`

```typescript
// Check admin permissions
const admin = await prisma.tournamentAdmin.findFirst({...});

// Gap where state could change
// ...

// Update registration
await prisma.registration.update({...});
```

No transaction wrapping these operations.

### Risk Assessment

- **Severity**: 🔴 CRITICAL
- **Impact**: Admin could approve registration that was already processed, or approve for wrong tournament
- **Likelihood**: Medium - requires concurrent requests

## Proposed Solutions

### Solution A: Wrap in Prisma Transaction (Recommended)
Wrap the check and update in a transaction:

```typescript
await prisma.$transaction(async (tx) => {
  const admin = await tx.tournamentAdmin.findFirst({...});
  if (!admin) throw new Error('Not authorized');

  await tx.registration.update({
    where: { id: registrationId },
    data: { status: RegistrationStatus.CONFIRMED }
  });
});
```

**Pros**: Atomic operation, proper locking
**Cons**: Slightly longer transaction time
**Effort**: Small
**Risk**: Low

### Solution B: Optimistic Locking with Version Field
Add version field to Registration and use optimistic locking:

**Pros**: Better concurrency control
**Cons**: Schema change required
**Effort**: Medium
**Risk**: Low

## Recommended Action

**Solution A** - Wrap admin check and registration update in Prisma transaction.

## Technical Details

**Affected Files**:
- `apps/bot/src/handlers/registration.ts`
- `apps/bot/src/handlers/registration.ts` (approveRegistration, rejectRegistration)

**Related Patterns**: Already used correctly in matchService.ts

## Acceptance Criteria

- [ ] Registration approval uses Prisma transaction
- [ ] Registration rejection uses Prisma transaction
- [ ] Proper error handling for transaction failures

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Fixed | Wrapped approve/reject operations in Prisma transactions |

## Resources

- [Prisma Transactions](https://www.prisma.io/docs/guides/performance-and-optimization/prisma-transactions)
- Existing pattern: `apps/bot/src/services/matchService.ts:439-474`
