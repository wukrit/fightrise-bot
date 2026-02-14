---
title: Automated QA Skill
type: feat
status: completed
date: 2026-02-14
---

# Automated QA Skill

## Overview

Create an on-demand QA skill (`/qa`) that enables automated testing workflows: generating MSW mocks from real Start.gg API responses, running the full test suite, and executing smoke tests against real Discord and Start.gg APIs using credentials from .env.

## Enhancement Summary

**Deepened on:** 2026-02-14
**Revised on:** 2026-02-14 (after code review)
**Sections enhanced:** Architecture, Implementation, Security, Code Simplicity, TypeScript

### Key Improvements from Research

1. **Skill Structure**: Use `.claude/skills/qa/SKILL.md` format with progressive disclosure
2. **Security**: Added credential redaction for subprocesses, path validation, log sanitization
3. **Architecture**: Flattened structure (removed unnecessary commands/ layer), added shared sanitizer
4. **Simplification**: Removed redundant phases, consolidated lib files, reusing existing smoke tests
5. **TypeScript**: Added type-safe credential validation, discriminated unions, proper typing

### Code Review Findings Incorporated

- **P2**: Extracted duplicate sanitization to `src/lib/sanitize.ts`
- **P2**: Flattened directory structure (removed `commands/` + `lib/` split)
- **P2**: Added Zod schema validation for credentials
- **P3**: Added constants file for npm commands and paths
- **P3**: Added error types file
- **P3**: Standardized command file names

---

## Problem Statement

Currently, testing relies on manually maintained MSW mocks and doesn't have an automated way to:
1. Capture real API responses and generate/updating mocks
2. Run comprehensive test coverage validation
3. Verify bot behavior against real Discord/Start.gg APIs

This limits the ability to keep mocks synchronized with API changes and to catch integration issues early.

## Proposed Solution

### Skill Architecture

```
.claude/skills/qa/
├── SKILL.md                    # Skill definition (entry point)
├── prompts/
│   └── qa-skill.md            # Main skill prompt
├── docs/
│   ├── mock-generation.md     # Reference docs
│   ├── test-execution.md
│   └── smoke-tests.md
└── src/
    ├── index.ts               # Entry point + subcommand routing
    ├── generate-mocks.ts      # Generate mocks command
    ├── run-tests.ts           # Run tests command
    ├── run-smoke.ts           # Run smoke tests command
    ├── mock-generator.ts      # Mock generation logic
    ├── test-runner.ts         # Test execution logic
    ├── smoke-runner.ts        # Smoke test logic
    ├── env-loader.ts          # Credential loading
    ├── sanitize.ts            # Shared sanitization (P2 fix)
    ├── constants.ts           # Command strings, paths (P3)
    └── types/
        ├── index.ts           # Shared interfaces
        └── errors.ts           # Custom error types (P3)
```

### Key Design Decisions

1. **Mock Generation**: Reads `STARTGG_API_KEY` from `.env` at runtime, fetches actual GraphQL responses using queries from startgg-client package, strips sensitive fields, saves to staging then prompts for diff review before writing to `packages/startgg-client/src/__mocks__/`
2. **Credential Security**:
   - Never log or persist credentials
   - Sanitize environment variables passed to subprocesses (via shared `sanitize.ts`)
   - Use structured logging with automatic redaction
   - Type-safe credential validation with Zod
3. **Discord MCP Integration**: Uses existing smoke tests via npm script, not rewriting MCP integration
4. **On-Demand Execution**: Skill runs only when invoked, not automatically
5. **Simplification**: Reuse existing npm scripts and smoke tests instead of reimplementing

---

## Technical Approach

### 1. Shared Sanitizer (`src/lib/sanitize.ts`) - P2 Fix

```typescript
// Extracted from duplicate locations - single source of truth
export const SENSITIVE_KEY_PATTERN = /TOKEN|SECRET|KEY|PASSWORD|CLIENT_SECRET/i;

export function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? '***REDACTED***'
      : (value ?? '');
  }
  return sanitized;
}

export function sanitizeValue(value: string): string {
  return SENSITIVE_KEY_PATTERN.test(value) ? '***REDACTED***' : value;
}
```

### 2. Constants (`src/lib/constants.ts`) - P3 Addition

```typescript
// NPM commands
export const NPM_COMMANDS = {
  DOCKER_INFRA: 'docker:infra',
  DOCKER_DB_PUSH: 'docker:db:push',
  DOCKER_TEST: 'docker:test',
  DOCKER_TEST_INTEGRATION: 'docker:test:integration',
  DOCKER_TEST_E2E: 'docker:test:e2e',
  DOCKER_LINT: 'docker:lint',
} as const;

// File paths
export const PATHS = {
  STAGING_DIR: 'tmp/qa-mocks',
  HANDLERS_FILE: 'handlers.ts',
  MOCKS_TARGET: 'packages/startgg-client/src/__mocks__/handlers.ts',
} as const;

// Required credentials per operation
export const REQUIRED_CREDENTIALS = {
  'generate-mocks': ['STARTGG_API_KEY'] as const,
  'smoke': ['SMOKE_DISCORD_TOKEN', 'SMOKE_STARTGG_API_KEY'] as const,
  'run-tests': [] as const,
} as const;
```

### 3. Error Types (`src/lib/errors.ts`) - P3 Addition

```typescript
export class QAError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QAError';
  }
}

export class MissingCredentialsError extends QAError {
  constructor(missing: string[]) {
    super(`Missing required credentials: ${missing.join(', ')}`);
    this.name = 'MissingCredentialsError';
  }
}

export class MockGenerationError extends QAError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'MockGenerationError';
  }
}

export class TestExecutionError extends QAError {
  constructor(public readonly layer: string, public readonly exitCode: number) {
    super(`Test layer "${layer}" failed with exit code ${exitCode}`);
    this.name = 'TestExecutionError';
  }
}
```

### 4. Mock Generator (`src/mock-generator.ts`)

**Functionality:**
- Accept list of GraphQL queries to fetch (using queries from `@fightrise/startgg-client`)
- Execute queries against real Start.gg API using `.env` credentials
- Sanitize responses: remove user IDs, tokens, timestamps, real names
- Generate MSW handlers in TypeScript matching existing patterns
- Write to staging directory first, show diff, require confirmation before writing

**Sanitization Rules:**
- Discord/Start.gg user IDs → `"mock-user-1"`, `"mock-user-2"`
- Tournament/Event IDs → `"mock-tournament-1"`, `"mock-event-1"`
- Timestamps → static dates (e.g., `"2026-01-01T00:00:00Z"`)
- Real names → `"Mock Player 1"`, `"Mock Player 2"`

**Security Implementation:**
```typescript
import { PATHS } from './lib/constants.js';
import { sanitizeValue } from './lib/sanitize.js';

// Atomic write with staging:
const stagingPath = path.join(process.cwd(), PATHS.STAGING_DIR, PATHS.HANDLERS_FILE);
writeFileSync(stagingPath, generatedCode);

// Show diff to user
const diff = execSync(`diff -u ${PATHS.MOCKS_TARGET} ${stagingPath}`);

// Only write after user confirmation
if (userConfirms) {
  atomicRename(stagingPath, PATHS.MOCKS_TARGET);
}
```

### 5. Test Runner (`src/test-runner.ts`)

**Functionality:**
- Execute Docker-based test commands sequentially
- Sanitize environment variables passed to subprocesses (using shared `sanitize.ts`)
- Report pass/fail status for each layer
- Aggregate results and exit with appropriate code

**Commands Executed:**
```bash
npm run docker:infra         # Ensure Postgres/Redis running
npm run docker:db:push      # Ensure schema up to date
npm run docker:test         # Unit tests
npm run docker:test:integration  # Integration tests
npm run docker:test:e2e     # E2E tests
npm run docker:lint         # Linting
```

### 6. Smoke Runner (`src/smoke-runner.ts`)

**Functionality:**
- Validate `.env` credentials exist before running
- Run Start.gg API smoke tests via `npm run test:smoke`
- Run Discord smoke tests via `npm run test:smoke` with SMOKE_* env vars
- Report results

**Note:** Reuses existing smoke tests in `apps/bot/src/__tests__/smoke/` instead of reimplementing.

### 7. Env Loader (`src/env-loader.ts`) - With P2/P3 Fixes

```typescript
import { z } from 'zod';
import { REQUIRED_CREDENTIALS } from './lib/constants.js';
import { MissingCredentialsError } from './lib/errors.js';

// Credential schema with validation
const CredentialSchema = z.object({
  STARTGG_API_KEY: z.string().optional(),
  DISCORD_TOKEN: z.string().optional(),
  SMOKE_DISCORD_TOKEN: z.string().optional(),
  SMOKE_STARTGG_API_KEY: z.string().optional(),
});

type Credentials = z.infer<typeof CredentialSchema>;

function loadEnv(): Credentials {
  const projectRoot = findProjectRoot();
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found in project root');
  }
  return CredentialSchema.parse(dotenv.config({ path: envPath }).parsed || {});
}

export function loadAndValidateEnv(operation: keyof typeof REQUIRED_CREDENTIALS): Credentials {
  const env = loadEnv();
  const required = REQUIRED_CREDENTIALS[operation];

  const missing = required.filter(key => !env[key]);
  if (missing.length > 0) {
    throw new MissingCredentialsError(missing);
  }

  return env;
}
```

### 8. Type Definitions (`src/types/index.ts`)

```typescript
import type { TestLayer } from '../test-runner.js';

// Discriminated union for test layers
export type TestLayer = 'unit' | 'integration' | 'e2e' | 'lint';

// Result types
export interface CommandResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration?: number;
}

export interface TestRunResult {
  success: boolean;
  layers: LayerResult[];
}

export interface LayerResult {
  layer: TestLayer;
  passed: number;
  failed: number;
  duration: number;
}

export interface MockGeneratorOptions {
  queries: string[];
  dryRun?: boolean;
}
```

## Implementation Phases

### Phase 1: Skill Infrastructure

- [x] Create `.claude/skills/qa/SKILL.md` with skill definition
- [x] Create `src/lib/constants.ts` with npm commands, paths, credential requirements
- [x] Create `src/lib/errors.ts` with custom error classes
- [x] Create `src/lib/sanitize.ts` with shared sanitization functions (P2 fix)
- [x] Create `src/types/index.ts` with shared interfaces
- [x] Test skill can be invoked

### Phase 2: Test Runner

- [x] Implement `src/run-tests.ts` command
- [x] Implement `src/test-runner.ts` with sanitized subprocess execution
- [x] Test running test suite

### Phase 3: Mock Generator

- [x] Implement `src/generate-mocks.ts` command
- [x] Implement `src/mock-generator.ts`
  - [x] Import GraphQL queries from `@fightrise/startgg-client`
  - [x] Fetch real API responses
  - [x] Sanitize and generate handlers
  - [x] Write to staging with diff review
- [x] Test mock generation

### Phase 4: Smoke Tests

- [x] Implement `src/run-smoke.ts` command (P3 fix: renamed from smoke.ts)
- [x] Reuse existing smoke tests via npm scripts
- [x] Test smoke tests work

### Phase 5: Polish

- [x] Add progress reporting and error handling
- [x] Document skill usage in SKILL.md

---

## Acceptance Criteria

### Functional Requirements

- [ ] `/qa run-tests` executes all test layers and reports results
- [ ] `/qa generate-mocks` fetches real Start.gg responses and generates valid MSW handlers (with diff review before writing)
- [ ] `/qa smoke` validates credentials and runs real API tests
- [ ] All commands work without credentials exposed in logs or files

### Non-Functional Requirements

- [ ] Mock generation produces TypeScript valid handlers
- [ ] Test runner exits with non-zero code on failure
- [ ] Smoke tests gracefully skip if credentials missing
- [ ] Skill works from any directory in the project

### Security Requirements

- [ ] Credentials never passed to subprocesses without redaction (using shared sanitize.ts)
- [ ] Output path validated against path traversal
- [ ] No user input in shell commands
- [ ] Structured logging with automatic credential redaction
- [ ] Atomic file writes for generated handlers

### TypeScript Requirements

- [ ] Use discriminated unions for test layers
- [ ] Zod validation for credential loading
- [ ] Proper error types with custom error classes
- [ ] Type-safe credential validation per operation

### Quality Gates

- [ ] Generated mocks pass TypeScript compilation
- [ ] All existing tests still pass after mock updates
- [ ] Smoke tests work against test Discord server

---

## Dependencies & Risks

### Dependencies

- MSW v2 (already in project)
- Discord MCP (user has access)
- Docker (already in project)
- dotenv (already in project)
- zod (for type-safe validation)
- @fightrise/startgg-client (for GraphQL queries)

### Risks

1. **API Rate Limits**: Start.gg may rate-limit during mock generation
   - Mitigation: Add delays between requests, allow selective endpoint generation

2. **Credential Exposure**: Risk of credentials in logs or subprocesses
   - Mitigation: Strict credential handling, sanitize.ts for all subprocess calls

3. **Discord Test Server**: Need valid test server with bot installed
   - Mitigation: Validate server access before running smoke tests

4. **Path Traversal**: Mock generator writes to handlers.ts
   - Mitigation: Write to staging first, validate, atomic rename

---

## References & Research

### Internal References

- Existing MSW handlers: `packages/startgg-client/src/__mocks__/handlers.ts`
- Existing fixtures: `packages/startgg-client/src/__mocks__/fixtures.ts`
- Discord test harness: `apps/bot/src/__tests__/harness/`
- Existing smoke tests: `apps/bot/src/__tests__/smoke/`
- Docker test commands: `package.json` scripts
- Existing GraphQL queries: `packages/startgg-client/src/graphql/queries/`

### External References

- MSW Documentation: https://mswjs.io/docs/
- Start.gg GraphQL API: https://api.start.gg/gql/alpha
- Discord MCP Tools: Available via MCP server
- Zod Documentation: https://zod.dev/

### Architecture Review (from /workflows:review)

- Flattened structure (removed commands/ + lib/ split)
- Extracted shared sanitizer to eliminate duplication
- Added type-safe credential validation

### TypeScript Review (from /workflows:review)

- Added discriminated unions for test layers
- Added Zod schema validation for credentials
- Added custom error types
- Added constants file for maintainability

---

## File Structure

```
.claude/skills/qa/
├── SKILL.md                    # Skill definition
├── prompts/
│   └── qa-skill.md            # Main skill prompt
├── docs/
│   ├── mock-generation.md      # Reference docs
│   ├── test-execution.md
│   └── smoke-tests.md
└── src/
    ├── index.ts                # Entry point + routing
    ├── generate-mocks.ts       # Generate mocks command
    ├── run-tests.ts            # Run tests command
    ├── run-smoke.ts           # Run smoke command (P3: renamed)
    ├── mock-generator.ts      # Mock generation logic
    ├── test-runner.ts         # Test execution logic
    ├── smoke-runner.ts        # Smoke test logic
    ├── env-loader.ts          # Credential loading
    ├── sanitize.ts            # Shared sanitization (P2)
    ├── constants.ts           # Command strings, paths (P3)
    └── types/
        ├── index.ts           # Shared interfaces
        └── errors.ts          # Custom errors (P3)
```

## Next Steps

→ Run `/workflows:work` to implement this plan
