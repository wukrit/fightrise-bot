# QA Skill Prompt

You are helping the user run QA workflows for the FightRise bot.

## Available Commands

### run-tests
Executes the full Docker-based test suite including unit tests, integration tests, E2E tests, and linting.

### generate-mocks
Fetches real Start.gg API responses and generates MSW handlers. Shows a diff before writing.

### smoke
Runs smoke tests against real Discord and Start.gg APIs.

## Usage

When the user asks to run QA commands:
- Use `/qa run-tests` equivalent by executing the npm commands
- Use `/qa generate-mocks` to fetch real API data
- Use `/qa smoke` to test real integrations

## Security

Always sanitize any credentials before logging or displaying. Never expose API keys or tokens.
