# Change: Complete shared types and utilities package

GitHub Issue: #7

## Why

The `@fightrise/shared` package exists but is incomplete. It needs validation schemas for runtime type safety, standardized error types for consistent error handling across the monorepo, and date/time utilities for tournament scheduling operations.

## What Changes

- Add Zod validation schemas for tournament configuration and interaction IDs
- Create centralized error types and error codes for the entire application
- Add date/time utilities for formatting tournament times and calculating durations

## Impact

- Affected specs: shared-package (new capability)
- Affected code:
  - `packages/shared/src/` - New modules for validation, errors, datetime
  - `packages/shared/package.json` - Add zod dependency
  - Future consumers in `apps/bot/` and `apps/web/` can import these utilities
