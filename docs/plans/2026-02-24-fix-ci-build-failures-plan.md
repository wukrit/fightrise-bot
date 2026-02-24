---
status: completed
---

# CI Build Failures Fix Plan

## Overview

This plan addresses the CI failures on main branch caused by TypeScript build errors in the `@fightrise/startgg-client` package.

## CI Failure Summary

The last commit on main (`6686433` - "Revert 'complete: Resolve all code review TODOs'") causes all CI jobs to fail:
- Lint job ❌
- Integration Tests job ❌
- E2E Tests job ❌
- Smoke Tests job ❌

All failures occur during the TypeScript build phase in `@fightrise/startgg-client`.

## Root Cause Analysis

There are **3 TypeScript compilation errors** in `packages/startgg-client/src/`:

### Error 1: `timeout` property not in RequestConfig
```
src/index.ts(44,7): error TS2353: Object literal may only specify known properties, and 'timeout' does not exist in type 'RequestConfig'.
```

**Location**: `packages/startgg-client/src/index.ts` line 44

**Current code**:
```typescript
this.client = new GraphQLClient(STARTGG_API_URL, {
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
  },
  timeout: config.timeout ?? 30000, // 30 second default
});
```

**Problem**: In graphql-request v6, the `timeout` option is not directly supported in the constructor. Need to use a custom fetch wrapper or remove it.

### Error 2: SetState type mismatch
```
src/index.ts(207,5): error TS2322: Type '{ id: string; state: SetState; } | null' is not assignable to type '{ id: string; state: number; } | null'.
```

**Location**: `packages/startgg-client/src/index.ts` line 207

**Current code**:
```typescript
async reportSet(
  setId: string,
  winnerId: string
): Promise<{ id: string; state: number } | null> {
  // ... returns SetState enum, not number
}
```

**Problem**: The return type says `number` but the actual return uses `SetState` enum.

### Error 3: Cannot find module '@fightrise/shared'
```
src/types.ts(7,8): error TS2307: Cannot find module '@fightrise/shared' or its corresponding type declarations.
```

**Location**: `packages/startgg-client/src/types.ts` line 7

**Problem**: `@fightrise/shared` is not listed as a dependency in `packages/startgg-client/package.json`.

## Fix Implementation Plan

### Step 1: Add @fightrise/shared dependency
- Modify `packages/startgg-client/package.json`
- Add `"@fightrise/shared": "*"` to dependencies

### Step 2: Fix timeout configuration
- Modify `packages/startgg-client/src/index.ts` line ~44
- Remove direct `timeout` option
- Implement timeout via AbortController in request options or remove it entirely

### Step 3: Fix SetState type
- Modify `packages/startgg-client/src/index.ts` line ~207
- Change return type from `number` to `SetState` to match actual return value

### Step 4: Verify build
- Run `npm run build` in startgg-client package
- Confirm no TypeScript errors

### Step 5: Verify CI (after push)
- Push changes to `fix/ci-build-failures`
- Verify all CI jobs pass

## Files to Modify

1. `packages/startgg-client/package.json`
2. `packages/startgg-client/src/index.ts`

## Risk Assessment

- **Risk Level**: Low
- **Impact**: Fixes build errors only, no runtime behavior changes
- **Complexity**: Low - straightforward TypeScript fixes
