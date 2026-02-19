---
status: complete
priority: p2
issue_id: "087"
tags: [code-review, shared, type-safety]
dependencies: []
---

# Weakly-Typed Interaction Prefix

## Problem Statement

The interaction parsing functions return loosely-typed strings instead of using the union type of valid prefixes.

## Findings

### Evidence

**Location**: `packages/shared/src/interactions.ts:3-5`

```typescript
export function parseInteractionId(customId: string) {
  const [prefix, ...parts] = customId.split(':');
  return { prefix, parts }; // Returns string, not union type
}
```

### Risk Assessment

- **Severity**: 🟡 IMPORTANT
- **Impact**: No compile-time enforcement of valid prefixes
- **Likelihood**: Medium

## Proposed Solutions

### Solution A: Add Return Type Annotation (Recommended)
```typescript
export function parseInteractionId(customId: string): {
  prefix: typeof INTERACTION_PREFIX[keyof typeof INTERACTION_PREFIX];
  parts: string[];
} {
```

**Pros**: Type safety, compile-time errors
**Cons**: None
**Effort**: Small
**Risk**: Very Low

## Recommended Action

**Solution A** - Add return type with union of valid prefixes.

## Technical Details

**Affected Files**:
- `packages/shared/src/interactions.ts`

## Acceptance Criteria

- [x] parseInteractionId returns typed prefix
- [x] createInteractionId validates prefix parameter

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-19 | Created | Code review finding |
| 2026-02-19 | Fixed | Added proper type to createInteractionId function |
