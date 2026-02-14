---
name: qa
description: Run automated QA workflows: generate MSW mocks, run test suite, and execute smoke tests. Use npm scripts or invoke the skill directly.
argument-hint: <subcommand> [options]
disable-model-invocation: true
allowed-tools: Bash(npm *), Bash(docker *), Read, Write, Glob, Grep
---

# QA Skill

Run automated testing and mock generation workflows for FightRise bot.

## Quick Start

```bash
npm run qa:run-tests           # Run full test suite in Docker
npm run qa:generate-mocks    # Generate MSW handlers from Start.gg API
npm run qa:smoke             # Run tests against real Discord/Start.gg APIs
```

## Alternative: Direct Invocation

You can also run the skill directly:

```bash
npx tsx .claude/skills/qa/src/index.ts run-tests
npx tsx .claude/skills/qa/src/index.ts generate-mocks
npx tsx .claude/skills/qa/src/index.ts smoke
```

## Subcommands

### run-tests
Executes the Docker-based test suite:
- Unit tests (`docker:test`)
- Integration tests (`docker:test:integration`)
- E2E tests (`docker:test:e2e`)
- Linting (`docker:lint`)

### generate-mocks
Fetches real Start.gg GraphQL responses and generates MSW handlers.
- Requires: `STARTGG_API_KEY` in `.env`
- Output: `packages/startgg-client/src/__mocks__/handlers.ts`
- Shows diff before writing - requires confirmation

### smoke
Runs tests against real APIs:
- Validates Start.gg API key
- Uses Discord MCP to test bot in test server
- Requires: `SMOKE_DISCORD_TOKEN`, `SMOKE_STARTGG_API_KEY`, `SMOKE_DISCORD_GUILD_ID`

## Requirements

- Docker and docker compose
- `.env` file with required credentials
- For smoke tests: valid test Discord server with bot installed

## Security

All commands sanitize credentials:
- Environment variables passed to subprocesses are redacted
- Credentials never logged or persisted
- Mock generation requires confirmation before writing files

## Error Handling

- Missing credentials: Gracefully skip with warning
- Test failures: Exit with non-zero code, report failures
- API errors: Log sanitized error messages

## Note

This skill is stored in `.claude/skills/qa/` which is gitignored. The npm scripts provide the public interface.
