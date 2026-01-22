# Project Context

## Purpose

FightRise is a Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord. The goal is to streamline tournament operations by:

- Syncing tournament data from Start.gg automatically
- Creating Discord threads for each match when players are called
- Handling player check-ins via Discord button interactions
- Allowing score reporting directly in Discord with confirmation flow
- Providing a web portal for tournament configuration and admin management

## Tech Stack

### Runtime & Language
- **Node.js 18+** with TypeScript 5.3+
- **ES Modules** (`"type": "module"` in all packages)

### Monorepo
- **Turborepo** for build orchestration and caching
- **npm workspaces** for package linking (`workspace:*` protocol)

### Apps
- **Discord Bot** (`apps/bot`): discord.js v14, BullMQ for job queues, ioredis
- **Web Portal** (`apps/web`): Next.js 14 (App Router), React 18, NextAuth.js

### Packages
- **@fightrise/database**: Prisma ORM with PostgreSQL
- **@fightrise/startgg-client**: GraphQL client using graphql-request
- **@fightrise/shared**: Shared types and utilities
- **@fightrise/ui**: Shared React components

### Infrastructure
- **PostgreSQL 15** for persistent data
- **Redis 7** for BullMQ job queues and caching

### Testing
- **Vitest** for unit and integration tests

## Project Conventions

### Code Style
- ESLint for linting (`npm run lint`)
- Prefer `async/await` over raw Promises
- Use named exports; default exports only for module entry points
- Prisma models use PascalCase; database columns use camelCase

### Architecture Patterns
- **Service pattern**: Business logic in `services/` directories
- **Command pattern**: Discord slash commands in `commands/` with data + execute structure
- **Interaction handlers**: Button/select menu handlers in `interactions/`
- **Singleton Prisma client**: Reuse across hot reloads via globalThis caching

### Testing Strategy
- Unit tests for services and utilities
- Integration tests for API endpoints and Discord command handlers
- Use Vitest's mock system for external APIs (Start.gg, Discord)

### Git Workflow
- Main branch: `main`
- Feature branches: `feature/<description>` or `<change-id>` from OpenSpec
- Commit messages: imperative mood, concise subject line
- PRs require passing CI checks before merge

## Domain Context

### Fighting Game Tournaments
- **Tournament**: A competitive event, often spanning multiple games/brackets
- **Event**: A specific game bracket within a tournament (e.g., "Street Fighter 6 Singles")
- **Set/Match**: A single match between two players/teams
- **Entrant**: A registered participant in an event
- **Round**: Tournament stage (Winners Round 1, Losers Finals, Grand Finals, etc.)

### Start.gg Concepts
- **Slug**: URL-friendly identifier (e.g., `tournament/evo-2024/event/sf6-singles`)
- **Set State**: 1 = Not Started, 2 = Started/In Progress, 3 = Completed
- **Entrant vs Participant**: Entrant is the team/registration; Participant is the individual user

### Match Flow in FightRise
1. Polling detects a set is ready (both players determined)
2. Discord thread created, players pinged
3. Players check in via buttons (configurable time window)
4. Match plays out (external to system)
5. Players report winner via buttons
6. If winner self-reports, opponent must confirm; if loser reports, auto-confirmed
7. Result synced back to Start.gg via mutation

## Important Constraints

### Start.gg API Limitations
- **No webhooks**: Must poll for state changes
- **Rate limits**: Implement exponential backoff; cache aggressively
- **GraphQL only**: REST API deprecated

### Discord API Constraints
- Thread auto-archive after 24h of inactivity (configurable)
- Button interactions must respond within 3 seconds (use deferReply for longer operations)
- Rate limits on thread creation and member additions

### Data Consistency
- Start.gg is source of truth for bracket state
- Local database caches for performance and Discord thread mappings
- Score conflicts require admin resolution (dispute flow)

## External Dependencies

### Start.gg GraphQL API
- **Endpoint**: `https://api.start.gg/gql/alpha`
- **Auth**: Bearer token from developer settings
- **Schema**: https://smashgg-schema.netlify.app/
- **Key operations**: getTournament, getEventSets, getEventEntrants, reportBracketSet

### Discord API
- **Library**: discord.js v14
- **Required permissions**: Send Messages, Create Threads, Manage Threads, Embed Links, Mention Everyone, Use Application Commands
- **Required intents**: Guilds, GuildMessages, MessageContent

### OAuth Providers (via NextAuth)
- Discord OAuth2 for user authentication
- Start.gg OAuth2 for account linking and API access
