---
title: "ESLint no-explicit-any and Hardcoded Secrets Fix"
problem_type: build-errors
components:
  - apps/bot/src/types.d.ts
  - .mcp.json
severity: medium
when: "2026-02-14 during PR #68 lint check"
gh_issues:
  - "#68"
tags:
  - eslint
  - typescript
  - security
  - mcp
---

# ESLint no-explicit-any and Hardcoded Secrets Fix

## Problem

Two issues were discovered during PR #68 CI:

1. **ESLint error**: `apps/bot/src/types.d.ts` line 10 used `any[]` which violates `@typescript-eslint/no-explicit-any` rule
2. **Security issue**: `.mcp.json` contained hardcoded Discord token instead of environment variable

## Investigation

The CI lint check failed with:
```
/home/runner/work/fightrise-bot/fightrise-bot/apps/bot/src/types.d.ts
10:24  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
```

The `.mcp.json` config was found to have hardcoded credentials.

## Solution

### Fix 1: types.d.ts

Changed `any[]` to `unknown[]`:

```diff
-    execute: (...args: any[]) => void | Promise<void>;
+    execute: (...args: unknown[]) => void | Promise<void>;
```

`unknown[]` is type-safe while still allowing event handlers to receive any arguments.

### Fix 2: .mcp.json

Replaced hardcoded token with environment variable reference:

```diff
{
  "discord": {
    "command": "docker",
    "args": [
      "run",
      "--rm",
      "-i",
      "-e",
-      "DISCORD_TOKEN=<hardcoded-token>",
+      "DISCORD_TOKEN=${DISCORD_TOKEN}",
      "-e",
-      "DISCORD_GUILD_ID=<hardcoded-id>",
+      "DISCORD_GUILD_ID=${DISCORD_GUILD_ID}",
      "saseq/discord-mcp:latest"
    ]
  }
}
```

## Prevention

- **Never hardcode secrets** in configuration files - always use environment variables
- **Use `unknown[]` instead of `any[]`** in TypeScript for better type safety
- Run lint locally before pushing: `npm run lint`

## Related

- `.mcp.json` is already gitignored (see `.gitignore` line 60)
- Claude Code `/doctor` command can detect some config issues
