---
status: complete
priority: p3
issue_id: "093"
tags: [code-review, startgg-client, bug]
dependencies: []
---

# Incomplete GraphQL Error Handling

## Problem Statement

When multiple GraphQL errors occur, only the first error message is visible. This makes debugging difficult.

## Findings

### Evidence

**Location**: `packages/startgg-client/src/index.ts:93-116`

```typescript
throw new StartGGGraphQLError(
  `GraphQL error: ${errors[0].message}`, // Only first error shown
  errors
);
```

### Risk Assessment

- **Severity**: 🔵 NICE-TO-HAVE
- **Impact**: Harder debugging when multiple errors
- **Likelihood**: Medium

## Proposed Solutions

### Solution A: Include All Error Messages (Recommended)
```typescript
throw new StartGGGraphQLError(
  `GraphQL errors: ${errors.map(e => e.message).join(', ')}`,
  errors
);
```

**Pros**: Better debugging
**Cons**: Longer error messages
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Include all error messages in the error string.

## Technical Details

**Affected Files**:
- `packages/startgg-client/src/index.ts`

## Acceptance Criteria

- [ ] All error messages included

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
