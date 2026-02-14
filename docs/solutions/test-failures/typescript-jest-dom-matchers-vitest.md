---
issue_id: 20260214-001
title: "Fix UI test TypeScript errors - missing jest-dom type declarations"
category: test-failures
tags: [typescript, testing-library, jest-dom, vitest]
component: packages/ui
date: 2026-02-14
summary: Fixed TypeScript errors in UI package tests where jest-dom matchers like toBeInTheDocument were not recognized at compile time.
---

## Problem Description

The TypeScript compiler threw errors in UI test files:

```
src/Button.test.tsx(8,63): error TS2339: Property 'toBeInTheDocument' does not exist
src/DiscordIcon.test.tsx(15,17): error TS2339: Property 'toHaveAttribute' does not exist
src/UserAvatar.test.tsx(11,17): error TS2339: Property 'toHaveAttribute' does not exist
```

**Files affected:**
- `packages/ui/src/Button.test.tsx`
- `packages/ui/src/DiscordIcon.test.tsx`
- `packages/ui/src/UserAvatar.test.tsx`

**Affected matchers:**
- `toBeInTheDocument()`
- `toBeDisabled()`
- `toHaveAttribute()`

## Root Cause Analysis

The issue occurred because:

1. **Runtime vs Compile-time mismatch**: The `vitest.setup.ts` file already had the correct import:
   ```typescript
   import '@testing-library/jest-dom/vitest';
   ```

2. **TypeScript doesn't read setup files**: While Vitest executes the setup file at runtime to extend matchers, TypeScript's type checking does not automatically include types from setup files during compilation.

3. **Missing type declarations**: TypeScript needed explicit type declarations to recognize the matchers at compile time.

## Solution

### Step 1: Create Type Declaration File

Created `packages/ui/src/vitest.d.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

This is a **type declaration file** that TypeScript reads during compilation. The import pulls in type definitions for Jest DOM matchers.

### Step 2: Install Missing Dependencies

Installed `@testing-library/user-event` in the web package for tests requiring user interaction simulation:

```bash
npm install --save-dev @testing-library/user-event
```

## How the Fix Works

1. **Type Declaration Files (`.d.ts`)**: These files provide type information without generating JavaScript code. When TypeScript sees an import in a `.d.ts` file, it loads the corresponding type definitions.

2. **`@testing-library/jest-dom/vitest`**: This package exports type declarations for all custom matchers (`toBeInTheDocument`, `toHaveClass`, `toBeDisabled`, etc.) that extend Vitest's expect assertions.

3. **Why `vitest.setup.ts` wasn't enough**: The setup file is only executed when Vitest runs tests (at runtime). During `tsc` compilation, the setup files are not processed, so TypeScript had no knowledge of the extended matcher types.

## Prevention Strategies

### 1. Correct Import Path

Always use the vitest-specific import path:

```typescript
// CORRECT - Vitest-specific import
import '@testing-library/jest-dom/vitest';

// WRONG - Jest-specific import (causes TypeScript errors)
import '@testing-library/jest-dom';
```

### 2. Include Setup Files in TypeScript

Do NOT exclude setup files from TypeScript compilation:

```json
// tsconfig.json - WRONG
{
  "exclude": ["node_modules", "vitest.setup.ts"]
}

// tsconfig.json - CORRECT
{
  "include": ["**/*.ts", "**/*.tsx", "vitest.setup.ts"]
}
```

### 3. Add Type Declaration Files

Create a `.d.ts` file alongside test files when using custom matchers:

```typescript
// vitest.d.ts
import '@testing-library/jest-dom/vitest';
```

### 4. Configuration Checklist for New Test Files

- [ ] Environment: Set correct `environment` in vitest config (`jsdom` for DOM tests)
- [ ] Globals: Enable `globals: true` in vitest config
- [ ] Import Path: Use `import '@testing-library/jest-dom/vitest'` (NOT `jest-dom` alone)
- [ ] Dependencies: Ensure `@testing-library/jest-dom` v6+ is in devDependencies
- [ ] Type Declarations: Include setup files in tsconfig OR add type declaration file

## Related Files

| File | Purpose |
|------|---------|
| `packages/ui/vitest.setup.ts` | Runtime setup for jest-dom matchers |
| `packages/ui/vitest.config.ts` | Vitest configuration |
| `packages/ui/src/vitest.d.ts` | Type declarations for jest-dom |
| `apps/web/vitest.setup.ts` | Web app test setup |

## Related Documentation

- [Vitest Testing Library Setup](https://vitest.dev/guide/testing-types.html)
- [@testing-library/jest-dom GitHub](https://github.com/testing-library/jest-dom)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-14 | Identified TypeScript errors | Tests failed with missing property errors |
| 2026-02-14 | Created vitest.d.ts | Added type declaration file to packages/ui |
| 2026-02-14 | Installed user-event | Fixed missing dependency in web package |
| 2026-02-14 | Verified all tests pass | 305 unit tests, 27 web tests pass |
