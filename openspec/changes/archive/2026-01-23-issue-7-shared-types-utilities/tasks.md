# Tasks for issue-7-shared-types-utilities

## 1. Implementation

### 1.1 Add Zod dependency
- [x] Add zod to `packages/shared/package.json`
- [x] Run `npm install` to update lockfile

### 1.2 Create validation schemas
- [x] Create `packages/shared/src/schemas.ts`
- [x] Add `TournamentConfigSchema` (validates TournamentConfig)
- [x] Add `InteractionIdSchema` (validates interaction ID format)
- [x] Export all schemas from index.ts

### 1.3 Create error types
- [x] Create `packages/shared/src/errors.ts`
- [x] Define `FightRiseError` base class with code property
- [x] Define `ErrorCode` enum/const for standardized codes
- [x] Add specific error classes: `ValidationError`, `NotFoundError`, `PermissionError`, `DiscordError`, `ConfigurationError`
- [x] Export all errors from index.ts

### 1.4 Create date/time utilities
- [x] Create `packages/shared/src/datetime.ts`
- [x] Add `formatTournamentDate()` - format Unix timestamp for display
- [x] Add `formatDuration()` - format duration in human-readable form
- [x] Add `isWithinWindow()` - check if time is within a window (for check-in)
- [x] Add `getRelativeTime()` - get relative time string (e.g., "in 5 minutes")
- [x] Export all utilities from index.ts

### 1.5 Refactor index.ts
- [x] Organize exports by category (types, constants, helpers, schemas, errors, datetime)
- [x] Ensure no circular dependencies

## 2. Testing

- [x] Write unit tests for validation schemas in `packages/shared/src/schemas.test.ts`
- [x] Write unit tests for error types in `packages/shared/src/errors.test.ts`
- [x] Write unit tests for datetime utilities in `packages/shared/src/datetime.test.ts`
- [x] Ensure all tests pass: `npm run test` (62 tests passing)
- [x] Ensure linting passes: `npm run lint` (shared package passes; web failure is pre-existing Node.js version issue)

## 3. Verification

- [x] Verify package builds successfully: `npm run build --filter=@fightrise/shared`
- [x] Verify types are importable from other packages (dist/*.d.ts files generated)
- [x] Verify no circular dependencies exist (imports organized into separate modules)
