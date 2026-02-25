# External Integrations

**Analysis Date:** 2026-02-25

## APIs & External Services

**Tournament Data:**
- Start.gg GraphQL API - Tournament management and match results
  - Endpoint: `https://api.start.gg/gql/alpha`
  - Client: `packages/startgg-client/src/index.ts` (graphql-request)
  - Auth: Bearer token via `STARTGG_API_KEY` env var
  - Queries: Tournament, Event Sets, Event Entrants, Tournaments by Owner
  - Mutations: Report Set (submit match results)
  - Retry logic: Exponential backoff with rate limit handling
  - Caching: In-memory response cache with invalidation on mutations
  - Note: No webhooks available - polling required

**Discord API:**
- Discord Bot - Match notifications, score reporting, player check-in
  - Library: discord.js 14.14
  - Auth: Bot token via `DISCORD_TOKEN` env var
  - Features: Slash commands, threads, button interactions
  - Required intents: Guilds, GuildMessages, MessageContent

## Data Storage

**Databases:**
- PostgreSQL 15
  - Connection: `DATABASE_URL` env var
  - ORM: Prisma 5.7
  - Schema: `packages/database/prisma/schema.prisma`
  - Models: User, Tournament, Event, Match, MatchPlayer, GameResult, Dispute, Registration, TournamentAdmin, GuildConfig, AuditLog

**File Storage:**
- Local filesystem only (no cloud storage integration)

**Caching:**
- Redis 7
  - Connection: `REDIS_URL` env var
  - Usage: BullMQ job queue backend
  - Not used for application data caching

## Authentication & Identity

**Discord OAuth:**
- Provider: next-auth with DiscordProvider
  - Config: `apps/web/lib/auth.ts`
  - Scopes: `identify`, `guilds`
  - User linking: Discord ID linked to internal User model

**Start.gg OAuth:**
- Partial implementation - optional for advanced authentication
  - Callback route: `apps/web/app/api/auth/callback/startgg/route.ts`
  - Client ID/Secret via env vars (optional)

**API Keys:**
- Custom API key system for programmatic access
  - Format: `frk_` prefix
  - Storage: SHA-256 hashed in database
  - Expiration: Optional expiry date

## Monitoring & Observability

**Error Tracking:**
- Not detected - no external error tracking service

**Logs:**
- pino 9.0 (bot)
- Console logging (web - Next.js default)

## CI/CD & Deployment

**Hosting:**
- Self-hosted (Docker-based)
- Services orchestrated via Docker Compose

**CI Pipeline:**
- GitHub Actions workflows
  - Located: `.github/workflows/`
  - Tests: Unit, integration, E2E, smoke tests
  - Linting: ESLint

**Docker:**
- Development: `docker/docker-compose.dev.yml`
- Services: postgres, redis, bot, web, tunnel (optional), pgadmin (optional), redis-commander (optional)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `DISCORD_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth secret
- `STARTGG_API_KEY` - Start.gg API token
- `NEXTAUTH_URL` - Web app URL
- `NEXTAUTH_SECRET` - Session encryption key

**Optional env vars:**
- `STARTGG_CLIENT_ID`, `STARTGG_CLIENT_SECRET` - Start.gg OAuth
- `SMOKE_*` variables - Smoke test credentials
- `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` - pgAdmin access
- `BULLMQ_CONCURRENCY` - Worker concurrency

**Secrets location:**
- `.env` file (not committed to version control)
- Template: `.env.example`

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints

**Outgoing:**
- Not detected - No outgoing webhooks

---

*Integration audit: 2026-02-25*
