# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FightRise is a Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord. It syncs tournament data from Start.gg's GraphQL API, creates match threads in Discord, handles player check-ins, and allows score reporting through Discord interactions.

## Commands

```bash
# Development
npm run dev                    # Run all apps/packages in dev mode (turbo)
npm run dev -- --filter=@fightrise/bot   # Run just the bot
npm run dev -- --filter=@fightrise/web   # Run just the web app

# Build & Start
npm run build                  # Build all packages
npm run start:bot              # Start Discord bot (production)
npm run start:web              # Start web portal (production)

# Database (run from packages/database or root)
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to database (dev)
npm run db:migrate             # Run migrations (production)

# Testing & Linting (ALWAYS run in Docker for consistency)
npm run docker:infra          # Start Postgres and Redis first
npm run docker:db:push        # Push database schema
npm run docker:test           # Run unit tests in Docker
npm run docker:test:integration  # Run integration tests in Docker
npm run docker:test:e2e       # Run Playwright E2E tests in Docker
npm run docker:lint           # Run ESLint in Docker

# Smoke tests (against real APIs - requires credentials)
# Run on host with environment variables:
#   SMOKE_DISCORD_TOKEN=xxx SMOKE_STARTGG_API_KEY=xxx npm run test:smoke

# Docker Development (recommended)
npm run docker:dev          # Full stack with hot-reload
npm run docker:dev:tunnel   # With Cloudflare Tunnel for OAuth
npm run docker:dev:tools    # With pgAdmin and Redis Commander
npm run docker:dev:all      # Everything
npm run docker:down         # Stop all services
npm run docker:infra        # Just Postgres and Redis

# Docker commands (run in containers)
npm run docker:db:generate  # Generate Prisma client
npm run docker:db:push      # Push schema to database
npm run docker:db:migrate   # Run migrations
npm run docker:deploy       # Deploy Discord commands
npm run docker:exec:web -- <cmd>  # Run any command in web container
npm run docker:exec:bot -- <cmd>  # Run any command in bot container

# Cloudflare Tunnel (for OAuth development)
npm run tunnel                 # Exposes localhost:3000 for OAuth callbacks
```

## Architecture

This is a Turborepo monorepo with two apps and four shared packages:

```
apps/
├── bot/          # Discord bot (discord.js v14, BullMQ for polling)
└── web/          # Next.js 14 web portal (App Router, NextAuth)

packages/
├── database/     # Prisma schema, client, and migrations
├── startgg-client/  # Start.gg GraphQL API wrapper
├── shared/       # Shared types and utilities
└── ui/           # Shared React components
```

### Data Flow

1. **Start.gg Polling**: BullMQ jobs poll Start.gg GraphQL API for tournament/match state changes (no webhooks available)
2. **Match Ready**: When a match is ready, bot creates a Discord thread and pings players
3. **Check-in**: Players use Discord buttons to check in within the configured window
4. **Score Reporting**: Players report scores via Discord buttons; loser confirmation auto-submits to Start.gg
5. **Sync Back**: Results are reported to Start.gg via GraphQL mutation

### Key Models (Prisma)

- `Tournament` - Cached Start.gg tournament with Discord guild/channel config
- `Event` - Tournament events (game brackets)
- `Match` - Individual matches with Discord thread ID and check-in state
- `MatchPlayer` - Match participants with check-in and score status
- `User` - Links Discord accounts to Start.gg accounts
- `Registration` - Tournament registrations (from Discord, Start.gg, or manual)

## Environment Setup

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis for BullMQ job queues
- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` - Discord bot credentials
- `STARTGG_API_KEY` - Start.gg API token
- `NEXTAUTH_SECRET` - NextAuth encryption key

### OAuth Development

OAuth providers require publicly accessible callback URLs. For local development:

1. Start the Cloudflare Tunnel: `npm run tunnel`
2. Use the tunnel URL in your `.env`: `NEXTAUTH_URL=https://fightrise-dev.yourdomain.com`
3. Register the tunnel callback URLs with Discord and Start.gg OAuth settings

See [Tunnel Setup Guide](./docs/TUNNEL_SETUP.md) for initial configuration.

## Key Integrations

### Start.gg GraphQL API
- Endpoint: `https://api.start.gg/gql/alpha`
- Schema explorer: https://smashgg-schema.netlify.app/
- No webhooks - polling required with dynamic intervals (15s active, 5min inactive)

### Discord.js
- Uses slash commands, threads, button interactions
- Required intents: Guilds, GuildMessages, MessageContent
- Match threads auto-archive after completion

## Package Dependencies

Internal packages use `*` version specifier with npm workspaces. Run `npm install` at root to link them.

Bot dependencies: `discord.js`, `bullmq`, `ioredis`, `@fightrise/database`, `@fightrise/startgg-client`
Web dependencies: `next`, `react`, `next-auth`, `@fightrise/database`, `@fightrise/ui`

## Frontend Development (MANDATORY)

When working on frontend features in `apps/web/`:

### Use Shared UI Components
- **Always** use components from `packages/ui/` for consistency across the application
- If a needed component doesn't exist, add it to `packages/ui/` rather than creating app-specific components
- Avoid inline styles - use the shared styling system from `packages/ui/`
- Exception: One-off components that are truly page-specific and won't be reused

### Use the /frontend-design Skill
- **Always** use `/frontend-design` when creating or modifying UI components, pages, or layouts
- This skill ensures high design quality and avoids generic AI aesthetics
- Invoke it at the start of frontend work, not after writing code

### Component Guidelines
- Keep components in `packages/ui/` generic and reusable
- App-specific wiring (e.g., NextAuth integration) belongs in `apps/web/components/`
- Document component props with TypeScript interfaces

---

## Agentic Workflow (MANDATORY)

When working on GitHub issues or features, use the **compound-engineering** workflow. This emphasizes thorough planning (80%) before coding (20%).

### Core Workflow Commands

| Command | Purpose |
|---------|---------|
| `/workflows:plan` | Create detailed implementation plan from feature idea |
| `/workflows:work` | Execute plan with task tracking |
| `/workflows:review` | Multi-agent code review before merging |
| `/workflows:compound` | Document learnings to make future work easier |

### Step 1: Branch Creation
- Fetch the GitHub issue details using `gh issue view`
- Create a new branch from `main` with format: `issue-<number>-<short-description>`
- Example: `issue-42-add-match-notifications`

### Step 2: Planning with `/workflows:plan`
- Run `/workflows:plan` to create a detailed implementation plan
- The plan should include:
  - Clear problem statement and goals
  - Technical approach and design decisions
  - Task breakdown with testable items
  - Risk assessment and edge cases
- **STOP and get user approval before proceeding**

### Step 3: Implementation with `/workflows:work`
- Run `/workflows:work` to execute the plan systematically
- Mark tasks complete as you go
- Follow existing code patterns and conventions from `openspec/project.md`
- Commit incrementally with clear messages

### Step 4: Testing

**IMPORTANT: Always run tests in Docker for consistency with CI/CD pipeline.**

Use the multi-layered test suite based on what you're building:

| Layer | Command | When to Use |
|-------|---------|-------------|
| **Unit** | `npm run docker:test` | Pure functions, validators, utilities |
| **Integration** | `npm run docker:test:integration` | Services with database, bot command flows |
| **E2E** | `npm run docker:test:e2e` | Browser user flows (web portal) |

**Prerequisites for all tests:**
```bash
npm run docker:infra    # Start Postgres and Redis
npm run docker:db:push # Push database schema
```

**Test Infrastructure:**
- **Discord Bot**: Use test harness in `apps/bot/src/__tests__/harness/`
  - `DiscordTestClient` - Mock Discord.js client for command testing
  - `MockInteraction` - Simulate slash commands and button clicks
  - `MockChannel` - Track messages and threads created
- **Start.gg API**: Use MSW mocks in `packages/startgg-client/src/__mocks__/`
  - `handlers.ts` - GraphQL query/mutation handlers
  - `fixtures.ts` - Realistic response data
- **Database**: Use Testcontainers in `packages/database/src/__tests__/`
  - `setup.ts` - Spins up isolated PostgreSQL container
  - `seeders.ts` - Factory functions for all models
- **Web E2E**: Use Playwright in `apps/web/__tests__/e2e/`
  - `utils/auth.ts` - Session mocking utilities

**Requirements:**
- Write unit tests for all new functions/services
- Write integration tests for Discord commands using the test harness
- Write Playwright tests for new web UI features
- Ensure all tests pass: `npm run docker:test && npm run docker:test:integration`
- Ensure linting passes: `npm run lint`
- **Do not proceed if any tests fail**

### Step 5: End-to-End Verification

**For Web Features:**
1. Run Playwright E2E tests: `npm run docker:test:e2e`
2. For manual verification, use Playwright MCP tools:
   - `mcp__playwright__browser_navigate` to load pages
   - `mcp__playwright__browser_snapshot` to verify content
   - `mcp__playwright__browser_click` to test interactions

**For Bot Features:**
1. Write integration tests using the Discord test harness:
   ```typescript
   import { createDiscordTestClient } from '../harness';

   const client = createDiscordTestClient();
   client.registerCommand(myCommand);
   const interaction = await client.executeCommand('mycommand', { option: 'value' });
   expect(interaction.lastReply?.content).toBe('Expected response');
   ```
2. Run: `npm run docker:test:integration`

**For Database Changes:**
1. Verify migrations work: `npm run db:push`
2. Add seeders in `packages/database/src/__tests__/utils/seeders.ts` if needed
3. Write integration tests using Testcontainers (auto-spins up PostgreSQL)

**For Start.gg Integration:**
1. Add MSW handlers in `packages/startgg-client/src/__mocks__/handlers.ts`
2. Add fixtures in `packages/startgg-client/src/__mocks__/fixtures.ts`
3. Tests automatically use mocked API responses

Document any manual verification steps performed.

### Step 6: Review with `/workflows:review`
- Run `/workflows:review` for multi-agent code review
- Address any issues identified before proceeding

### Step 7: Pull Request
- Push the branch to origin
- Create PR using `gh pr create` with:
  - Title: Reference the issue (e.g., "Fix match notifications #42")
  - Body must include:
    - **Summary**: Brief description of changes
    - **Changes**: Key implementation details
    - **Testing**: What was tested and how
    - **Checklist**: Confirmation that all workflow steps were completed
- Link the PR to the issue

### Step 8: Document with `/workflows:compound`
- After PR is merged, run `/workflows:compound` to document learnings
- This makes future similar work easier for the team

### Workflow Enforcement

**CRITICAL RULES:**
1. Never write implementation code before the plan is approved
2. Never create a PR before all tests pass
3. Never skip end-to-end verification
4. Always track task completion during `/workflows:work`
5. If blocked at any step, stop and communicate the blocker to the user

### Quick Reference

```bash
# Planning and execution
/workflows:plan              # Create implementation plan
/workflows:work              # Execute plan with task tracking
/workflows:review            # Multi-agent code review
/workflows:compound          # Document learnings

# Run tests (ALWAYS in Docker)
npm run docker:infra         # Start Postgres and Redis first
npm run docker:db:push      # Push database schema
npm run docker:test         # Unit tests
npm run docker:test:integration  # Integration tests
npm run docker:test:e2e     # Playwright E2E tests
npm run docker:lint          # Linting

# Create PR
gh pr create --title "Title #42" --body "..."
```
