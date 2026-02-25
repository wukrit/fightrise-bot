# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Use kebab-case for all TypeScript files: `matchService.ts`, `pollingService.ts`, `registrationSyncService.ts`
- Commands: `<commandName>.ts` (e.g., `checkin.ts`, `report.ts`, `tournament.ts`)
- Tests: `<module>.test.ts` for unit tests, `<feature>.integration.test.ts` for integration tests
- Generated declaration files use `.d.ts` suffix

**Functions:**
- Use camelCase: `createMatchThread()`, `checkInPlayer()`, `validateTournamentSlug()`
- Use descriptive, action-oriented names: `getMatchStatus()`, `reportScore()`, `setupTournament()`
- Boolean functions start with `is`, `has`, or `can`: `isValidTournamentSlug()`, `hasErrorCode()`
- Private methods prefixed with underscore in classes: `_initializeClient()`

**Variables:**
- Use camelCase: `matchId`, `discordThreadId`, `checkInDeadline`
- Constants in UPPER_SNAKE_CASE: `MAX_SLUG_LENGTH`, `DEFAULT_TIMEOUT`
- Type names in PascalCase: `MatchState`, `TournamentSetupResult`, `MockTransactionClient`

**Types:**
- Interfaces preferred over types for public APIs
- Event types use past tense: `MatchReadyEvent`, `CheckInCompletedEvent`
- Error types use Error suffix: `ValidationError`, `NotFoundError`, `FightRiseError`

## Code Style

**Formatting:**
- No Prettier config detected - uses ESLint for formatting
- Line length target: 100 characters
- Indentation: 2 spaces
- Semicolons: required

**Linting:**
- Web app: `next/core-web-vitals` ESLint config (see `/home/ubuntu/fightrise-bot/apps/web/.eslintrc.json`)
- Bot and packages: Uses `@typescript-eslint` with standard rules
- Run linting: `npm run docker:lint`

**TypeScript Configuration:**
- Target: ES2022 (Node.js apps), ES2017 (web app)
- Strict mode: enabled
- Module system: NodeNext with `.js` extensions in imports
- No path aliases in bot/packages (uses package names directly)

## Import Organization

**Order (top to bottom):**
1. Node.js built-ins: `import { readFile } from 'fs';`
2. External packages: `import { Client } from 'discord.js';`
3. Internal packages (workspace): `import { prisma } from '@fightrise/database';`
4. Relative imports (same package): `import { createAuditLog } from './auditService.js';`

**Example from `/home/ubuntu/fightrise-bot/apps/bot/src/services/tournamentService.ts`:**
```typescript
import { prisma, TournamentState, EventState, AdminRole, Prisma, AuditAction, AuditSource } from '@fightrise/database';
import { StartGGClient, Tournament as StartGGTournament } from '@fightrise/startgg-client';
import { Client } from 'discord.js';
import { schedulePoll, calculatePollInterval } from './pollingService.js';
import { RegistrationSyncService } from './registrationSyncService.js';
import { validateTournamentSlug } from '@fightrise/shared';
import { ValidationError } from '@fightrise/shared';
import { createAuditLog } from './auditService.js';
```

**Notes:**
- Always include `.js` extension for relative imports
- Group related imports from the same package together
- Use explicit named imports rather than default imports for better tree-shaking

## Error Handling

**Pattern 1: Result Objects for Operations with Multiple Outcomes**

Services return result objects with success/error status rather than throwing:

```typescript
// From /home/ubuntu/fightrise-bot/apps/bot/src/services/matchService.ts
export async function checkInPlayer(
  matchId: string,
  discordUserId: string
): Promise<{
  success: boolean;
  message: string;
  bothCheckedIn?: boolean;
}> {
  // Returns { success: true, message: '...', bothCheckedIn: true/false }
  // Or { success: false, message: '...' }
}
```

**Pattern 2: Custom Error Classes for Distinct Error Types**

Use the error hierarchy from `/home/ubuntu/fightrise-bot/packages/shared/src/errors.ts`:

```typescript
import { FightRiseError, ValidationError, NotFoundError, ConfigurationError } from '@fightrise/shared';

export class TournamentService {
  async setupTournament(params: { ... }): Promise<TournamentSetupResult> {
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_LINKED', message: '...' } };
    }
    // Use discriminated unions for complex error types
  }
}
```

**Pattern 3: Logging and Null Returns**

For operations that may fail silently, log errors and return null:

```typescript
if (!match) {
  console.error(`[MatchService] Match not found: ${matchId}`);
  return null;
}
```

## Logging

**Framework:** Uses `console` directly (not Pino in services, though Pino is a dependency)

**Patterns:**
- Service logs include service name: `[MatchService] Match not found: ${matchId}`
- Error logs use `console.error`: `console.error('[AuditLog] Failed to create audit log:', error)`
- Info logs use `console.log`: `console.log('[RegistrationSync] No Discord channel configured')`
- Warning logs use `console.warn`: `console.warn('User does not have Start.gg OAuth token')`

## Comments

**When to Comment:**
- JSDoc on all exported functions and classes
- Complex business logic that requires explanation
- Non-obvious workarounds or assumptions
- TODO comments for incomplete work (tracked in codebase)

**JSDoc Pattern:**
```typescript
/**
 * Creates a Discord thread for a match and sends the initial embed with check-in buttons.
 * Returns the thread ID on success, or null if creation fails.
 *
 * This function is idempotent - if the match already has a thread, it returns the existing thread ID.
 */
export async function createMatchThread(
  client: Client,
  matchId: string
): Promise<string | null>
```

**Inline Comments:**
- Use for explaining WHY, not WHAT
- Example: `// Idempotency check - return existing thread ID if present`

## Function Design

**Size:** Keep functions focused - single responsibility. Large functions (>50 lines) should be decomposed.

**Parameters:**
- Use object parameters for functions with multiple arguments:
```typescript
async function setupTournament(params: {
  discordUserId: string;
  discordGuildId: string;
  slug: string;
})
```

**Return Values:**
- Use discriminated unions for operations with multiple outcomes:
```typescript
type TournamentSetupResult =
  | { success: true; tournament: TournamentWithEvents | null; isUpdate: boolean }
  | { success: false; error: TournamentSetupError };
```
- Return `null` for "not found" or "failed silently" scenarios
- Return empty arrays `[]` for "no results" rather than null

## Module Design

**Exports:**
- Named exports preferred: `export async function createMatchThread(...)`
- Export types alongside functions when closely related
- Barrel files (`index.ts`) for clean public APIs

**Barrel Files:**
- Use in packages for clean public API:
```typescript
// packages/shared/src/index.ts
export * from './validation.js';
export * from './errors.js';
export * from './interactions.js';
```

**Classes for Services:**
- Use classes to encapsulate stateful services (e.g., `TournamentService`, `RegistrationSyncService`)
- Use plain functions for stateless utilities (e.g., `validateTournamentSlug()`)

---

*Convention analysis: 2026-02-25*
