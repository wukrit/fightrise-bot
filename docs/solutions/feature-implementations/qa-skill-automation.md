---
title: "QA Skill Implementation"
category: feature-implementations
tags: [cli, testing, automation, skill, typescript]
module: .claude/skills/qa
symptom: "Need automated QA workflows for test execution, mock generation, and smoke testing"
root_cause: "Manual testing processes, no centralized QA commands"
---

# QA Skill Implementation

## Problem

The project needed automated QA workflows for:
- Running the full test suite (unit, integration, E2E, lint)
- Generating MSW mocks from real Start.gg API responses
- Running smoke tests against real Discord/Start.gg APIs

Manual processes were error-prone and time-consuming.

## Solution

Created a QA skill in `.claude/skills/qa/` with npm script wrappers for easy invocation.

### Architecture

```
.claude/skills/qa/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── run-tests.ts          # Test runner command
│   ├── generate-mocks.ts    # Mock generator command
│   ├── run-smoke.ts         # Smoke test command
│   ├── test-runner.ts        # Test execution logic
│   ├── mock-generator.ts     # MSW handler generation
│   ├── smoke-runner.ts      # Smoke test logic
│   └── lib/
│       ├── constants.ts      # NPM commands, paths, credentials
│       ├── project.ts        # Shared utilities (findProjectRoot, runNpmCommand)
│       ├── sanitize.ts       # Credential redaction
│       └── errors.ts         # Custom error types
```

### NPM Scripts (in package.json)

```json
{
  "qa": "npx tsx .claude/skills/qa/src/index.ts",
  "qa:run-tests": "npm run qa -- run-tests",
  "qa:generate-mocks": "npm run qa -- generate-mocks",
  "qa:smoke": "npm run qa -- smoke"
}
```

## Key Implementation Details

### Credential Sanitization

Always sanitize environment variables passed to subprocesses:

```typescript
// lib/sanitize.ts
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
```

### Shared Project Utilities

Extract duplicated code to shared utils:

```typescript
// lib/project.ts
export function findProjectRoot(): string {
  let current = process.cwd();
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error('Could not find project root');
}

export function runNpmCommand(command: string, cwd?: string): Promise<number> {
  const projectRoot = cwd || findProjectRoot();
  const [script, ...args] = command.split(' ');

  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script, ...args], {
      cwd: projectRoot,
      env: { ...sanitizeEnv(process.env), FORCE_COLOR: '1' },
      stdio: 'inherit',
    });

    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', reject);
  });
}
```

### Constants for Maintainability

Use constants instead of hardcoding:

```typescript
// lib/constants.ts
export const NPM_COMMANDS = {
  DOCKER_TEST: 'docker:test',
  DOCKER_TEST_INTEGRATION: 'docker:test:integration',
  DOCKER_TEST_E2E: 'docker:test:e2e',
  DOCKER_LINT: 'docker:lint',
} as const;

export const REQUIRED_CREDENTIALS = {
  'generate-mocks': ['STARTGG_API_KEY'] as const,
  'smoke': ['SMOKE_DISCORD_TOKEN', 'SMOKE_STARTGG_API_KEY'] as const,
  'run-tests': [] as const,
} as const;
```

## Learnings

### 1. .claude/ is GitIgnored

The `.claude/` directory is automatically gitignored, so skill code cannot be committed directly.

**Solution**: Use npm scripts in `package.json` that invoke the skill's TypeScript files via `tsx`:

```json
"qa": "npx tsx .claude/skills/qa/src/index.ts"
```

### 2. Extract Duplicated Code Early

`findProjectRoot()` and `runNpmCommand()` were needed in multiple files.

**Solution**: Create `lib/project.ts` as a shared utility module from the start.

### 3. Never Log API Key Prefixes

Logging partial API keys (e.g., `${key.substring(0, 8)}...`) can aid attackers.

**Solution**: Use generic messages:
```typescript
console.log('Using Start.gg API key: ***hidden***');
```

### 4. Use Constants Consistently

Hardcoding values like credential names in multiple files leads to inconsistency.

**Solution**: Define all config in `lib/constants.ts` and import where needed.

## Usage

```bash
# Run full test suite
npm run qa:run-tests

# Generate MSW handlers from Start.gg API
npm run qa:generate-mocks

# Run smoke tests against real APIs
npm run qa:smoke
```

## Related Files

- `.claude/skills/qa/` - Skill source code (gitignored)
- `package.json` - NPM script definitions
- `packages/startgg-client/src/__mocks__/` - MSW handlers
- `apps/bot/src/__tests__/smoke/` - Smoke tests

## Prevention Strategies

1. **For future skills**: Always create npm script wrappers if the skill code will be gitignored
2. **For shared code**: Extract to utility modules early, not after duplication occurs
3. **For credentials**: Never log any part of secrets, always use full redaction
4. **For config**: Centralize in constants files, import everywhere
