# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5.3 - All packages, both applications, and shared code

**Secondary:**
- Not applicable

## Runtime

**Environment:**
- Node.js 18+ (engine requirement in `package.json`)

**Package Manager:**
- npm 10.0.0 (specified as packageManager)
- Workspaces enabled (monorepo structure)

## Frameworks

**Discord Bot:**
- discord.js 14.14 - Discord API interactions (slash commands, threads, buttons)
- BullMQ 5.0 - Job queue for tournament polling workers
- ioredis 5.3 - Redis client for BullMQ
- pino 9.0 - Logging framework

**Web Portal:**
- Next.js 14 - React framework with App Router
- next-auth 4.24 - Authentication (Discord OAuth)
- React 18.2 - UI library

**Shared Packages:**
- @prisma/client 5.7 - Database ORM
- Prisma 5.7 - Database schema management
- Zod 4.3 - Schema validation

**Testing:**
- Vitest 1.0 - Test runner (unit tests)
- Playwright 1.58 - E2E testing
- MSW 2.0 - API mocking
- @testing-library/react 14 - React component testing
- @testcontainers/postgresql 10 - Database container for tests

**Build:**
- Turbo 2.0 - Monorepo build orchestration
- Vite 5.0 - Development server and bundling (packages, tests)
- tsx 4.6 - TypeScript execution for dev

## Key Dependencies

**Critical (Bot):**
- discord.js 14.14 - Discord bot framework
- bullmq 5.0 - Job queue for background workers
- @fightrise/startgg-client - Internal GraphQL client
- @fightrise/database - Prisma client
- @fightrise/shared - Shared types and validation

**Critical (Web):**
- next 14 - Next.js framework
- next-auth 4.24 - Authentication
- @fightrise/database - Prisma client
- @fightrise/ui - Shared UI components

**Start.gg Integration:**
- graphql-request 6.1 - GraphQL HTTP client
- graphql 16.8 - GraphQL type definitions

**UI Components:**
- @radix-ui/react-dialog 1.1 - Modal/Drawer primitives
- @radix-ui/react-select 2.1 - Select component
- @radix-ui/react-tooltip 1.1 - Tooltip component
- @radix-ui/react-slot 1.1 - Button polymorphic component

**Infrastructure:**
- PostgreSQL 15 - Primary database (via Docker)
- Redis 7 - Job queue backend (via Docker)

## Configuration

**Environment:**
- Environment variables via `.env` file
- Template: `.env.example` with all required variables
- Docker Compose manages infrastructure services

**Key environment variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for BullMQ
- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` - Discord bot
- `STARTGG_API_KEY` - Start.gg API token
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` - NextAuth configuration

**Build:**
- TypeScript configuration: `tsconfig.json` (root and per-package)
- Turborepo config: Implicit via `turbo.json` (not found - uses defaults)
- Next.js config: `apps/web/next.config.js`
- Vitest configs: Per-package `vitest.config.ts`

## Platform Requirements

**Development:**
- Node.js 18+
- Docker and Docker Compose
- Discord Developer account (for bot tokens)
- Start.gg Developer account (for API access)

**Production:**
- PostgreSQL 15 database
- Redis 7 for BullMQ job queue
- Discord Bot with appropriate intents (Guilds, GuildMessages, MessageContent)
- Start.gg API key

**Deployment:**
- Docker-based deployment via `docker-compose.dev.yml`
- Services: postgres, redis, bot, web
- Optional: Cloudflare Tunnel for OAuth development

---

*Stack analysis: 2026-02-25*
