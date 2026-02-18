# Contributing to FightRise

Thanks for your interest in contributing!

This guide covers dev environment setup, code conventions, and the PR process.

Topics covered:

- Setting up your dev environment
- Code style guidelines
- Testing requirements
- Pull request process

For detailed setup instructions, see [README.md](./README.md).
For detailed development workflow, see [CLAUDE.md](./CLAUDE.md).

## Development Setup

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- Discord Application (Bot Token, Client ID, Client Secret)
- Start.gg API Key

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/wukrit/fightrise-bot.git
cd fightrise-bot

# Install dependencies
npm install

# Copy environment file and configure credentials
cp .env.example .env

# Start development environment (recommended)
npm run docker:dev
```

This starts PostgreSQL, Redis, the Discord bot, and the web portal with hot-reload.

### Database Setup

```bash
# Generate Prisma client and push schema
npm run docker:db:generate
npm run docker:db:push

# Deploy Discord commands
npm run docker:deploy
```

## Code Style

### TypeScript

- Use strict TypeScript with explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use proper type inference for local variables

### ESLint

The project uses ESLint for code quality. Run linting before submitting:

```bash
# Run linting (required before PR)
npm run docker:lint
```

### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas where appropriate
- Use meaningful variable and function names

### React / Next.js

- Use shared UI components from `packages/ui/` for consistency
- Avoid inline styles - use the shared styling system
- Follow the component patterns in the codebase

### Discord Bot Patterns

Follow established patterns for:

- **Commands**: `apps/bot/src/commands/` - Use `SlashCommandBuilder`
- **Services**: `apps/bot/src/services/` - Use Prisma transactions for atomic operations
- **Handlers**: `apps/bot/src/handlers/` - Register in the main router

## Testing

**Always run tests in Docker for consistency with CI/CD.**

```bash
# Start infrastructure
npm run docker:infra
npm run docker:db:push

# Run all tests
npm run docker:test         # Unit tests
npm run docker:test:integration  # Integration tests
npm run docker:test:e2e     # E2E tests
npm run docker:lint        # Linting
```

### Writing Tests

| Component | Test Framework | Location |
| --- | --- | --- |
| Discord Bot | Custom harness | `apps/bot/src/__tests__/` |
| Start.gg Client | MSW mocks | `packages/startgg-client/src/__mocks__/` |
| Database | Testcontainers | `packages/database/src/__tests__/` |
| Web E2E | Playwright | `apps/web/__tests__/e2e/` |

- Write unit tests for all new functions and services
- Write integration tests for Discord commands
- Write Playwright tests for new web UI features

## Pull Request Process

### Branch Naming

Use the format: `issue-<number>-<description>`

Example: `issue-42-add-match-notifications`

### Commit Messages

Use clear, descriptive commit messages:

```text
feat: Add match notification system
fix: Resolve check-in race condition
refactor: Extract tournament status helper
docs: Update API documentation
```

### Before Submitting

1. **Run all tests:**

   ```bash
   npm run docker:test && npm run docker:test:integration && npm run docker:lint
   ```

2. **Ensure tests pass** - Do not submit if any tests fail

3. **Follow code patterns** - Match the existing codebase style

4. **Write appropriate tests** - Add tests for new functionality

### Creating the PR

1. Push your branch: `git push -u origin issue-<number>-<description>`
2. Create a PR with:
   - Title referencing the issue (e.g., "Add match notifications #42")
   - Summary of changes
   - Testing performed
   - Checklist confirming workflow steps completed

## Quick Reference

### Common Commands

```bash
# Development
npm run docker:dev          # Start all services with hot-reload
npm run docker:down         # Stop all services

# Testing
npm run docker:test         # Unit tests
npm run docker:test:integration  # Integration tests
npm run docker:test:e2e     # E2E tests
npm run docker:lint         # Linting

# Database
npm run docker:db:push      # Push schema to database

# Deployment
npm run docker:deploy       # Deploy Discord commands
```

### Key Files

| Category | Location |
| --- | --- |
| Bot Entry | `apps/bot/src/index.ts` |
| Command Router | `apps/bot/src/events/interactionCreate.ts` |
| Button Router | `apps/bot/src/handlers/buttonHandlers.ts` |
| Prisma Schema | `packages/database/prisma/schema.prisma` |
| Start.gg Client | `packages/startgg-client/src/client.ts` |
| Web Auth | `apps/web/lib/auth.ts` |

## Questions?

- Open an issue for bugs or feature requests
- Check [CLAUDE.md](./CLAUDE.md) for detailed development workflow
- Review existing code patterns in the codebase
