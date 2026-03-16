---
title: Beta Environment Setup
type: feat
status: completed
date: 2026-03-16
origin: docs/brainstorms/2026-03-16-beta-testing-readiness-brainstorm.md
---

# Beta Environment Setup

## Enhancement Summary

**Deepened on:** 2026-03-16
**Sections enhanced:** Technical Approach, System-Wide Impact, Dependencies & Risks
**Research agents used:** best-practices-researcher

### Key Improvements
1. Added docker-compose.beta.yml pattern following existing test environment conventions
2. Redis isolation via separate ports (consistent with test setup)
3. Added npm scripts for beta deployment
4. Fixed DMNO compatibility - added options for extending DMNO schema or using .env.beta directly
5. Fixed Redis wording - now says "separate Redis instance" instead of "shares"

### New Considerations Discovered
- Use port 5433 for beta Postgres (same pattern as test:5433)
- Use port 6380 for beta Redis (same pattern as test:6380)
- This matches existing docker-compose.test.yml conventions

## Overview

Set up a complete beta testing environment for FightRise to run real tournaments with 8-16 players. This involves creating a separate database, configuring a new Discord bot instance, and creating user documentation.

**Related Issue:** #37

## Problem Statement

The codebase has all core features implemented, but there's no isolated environment for testing with real users. Running beta tests against the same database/bot as development risks data corruption and confusing user experience.

## Proposed Solution

Create a beta environment with:
1. Separate database (`fightrise_beta`) in existing Postgres
2. New Discord application for beta bot
3. Beta environment configuration (`.env.beta`)
4. Tournament Organizer and Player quickstart guides
5. Manual end-to-end verification of core flows

This approach balances isolation with operational simplicity (see brainstorm).

## Technical Approach

### Database Setup

**Following the test environment pattern from `docker-compose.test.yml`:**

```sql
CREATE DATABASE fightrise_beta;
```

Or use separate Postgres container with different port:
```yaml
# docker-compose.beta.yml (optional - for isolated container)
services:
  postgres-beta:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: fightrise_beta
      POSTGRES_PASSWORD: betapassword
      POSTGRES_DB: fightrise_beta
    ports:
      - "5433:5432"  # Different port - matches test setup
```

Run Prisma schema push:
```bash
# Option 1: Direct (existing Postgres)
DATABASE_URL=postgresql://fightrise:devpassword@localhost:5432/fightrise_beta npx prisma db push

# Option 2: Docker with beta container
DATABASE_URL=postgresql://fightrise_beta:betapassword@localhost:5433/fightrise_beta npx prisma db push
```

### Discord Application

Create in Discord Developer Portal:
- New application: "FightRise Beta"
- Enable intents: Guilds, GuildMessages, MessageContent
- Generate bot token
- Create invite link with appropriate permissions

### Environment Configuration

**Important:** The project uses DMNO for environment management (see `.dmno/config.mts`). Options for beta:

#### Option A: Add to DMNO Schema (Recommended)

Extend `.dmno/config.mts` with beta variables:
```typescript
// In .dmno/config.mts - add beta section
BETA_DISCORD_TOKEN: {
  extends: DmnoBaseTypes.string,
  sensitive: true,
  value: process.env.BETA_DISCORD_TOKEN,
},
BETA_DISCORD_CLIENT_ID: { ... },
BETA_DISCORD_CLIENT_SECRET: { ... },
BETA_STARTGG_API_KEY: { ... },
```

Then set in `.dmno.env.local`:
```
BETA_DISCORD_TOKEN=beta_bot_token
BETA_DISCORD_CLIENT_ID=beta_client_id
...
```

#### Option B: Use .env file directly (Simpler for quick beta)

Create `.env.beta`:
```env
# Database - use port 5433 to match test environment pattern
DATABASE_URL=postgresql://fightrise_beta:betapassword@localhost:5433/fightrise_beta

# Discord - standard names (deploy script expects these)
DISCORD_TOKEN=beta_bot_token
DISCORD_CLIENT_ID=beta_client_id
DISCORD_CLIENT_SECRET=beta_client_secret

# Redis - use port 6380 to match test environment pattern
REDIS_URL=redis://localhost:6380

# Start.gg - standard name
STARTGG_API_KEY=your_beta_key

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=https://beta-url (if using web)
```

**Note:** Using standard variable names (not BETA_ prefix) makes deployment simpler since the deploy script expects `DISCORD_TOKEN`, etc.

### Deploying Beta Commands

Current deploy script uses `dotenv -e .env`, so for beta:
```bash
# Temporarily swap .env
cp .env .env.dev
cp .env.beta .env
npm run deploy
cp .env.dev .env
```

Or run directly in container:
```bash
docker compose run -e DATABASE_URL=.../fightrise_beta -e DISCORD_TOKEN=... bot npm run deploy
```

### Running Beta Bot

```bash
# Using inline env
docker compose run -e DATABASE_URL=.../fightrise_beta bot npm run dev
```

### Docker Compose Beta Override (Optional)

Create `docker/docker-compose.beta.yml` following the test pattern:
```yaml
# docker/docker-compose.beta.yml
services:
  postgres-beta:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: fightrise_beta
      POSTGRES_PASSWORD: betapassword
      POSTGRES_DB: fightrise_beta
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fightrise_beta"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis-beta:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    command: redis-server --appendonly no
```

Run with:
```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.beta.yml --env-file .env.beta up
```

### NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "docker:beta": "docker compose -f docker/docker-compose.yml -f docker/docker-compose.beta.yml --env-file .env.beta up",
    "docker:beta:down": "docker compose -f docker/docker-compose.yml -f docker/docker-compose.beta.yml --env-file .env.beta down",
    "docker:beta:deploy": "docker compose -f docker/docker-compose.yml -f docker/docker-compose.beta.yml --env-file .env.beta run bot npm run deploy"
  }
}
```

## System-Wide Impact

### Interaction Graph

- Beta bot operates independently from dev/production
- Uses separate Redis instance on port 6380 (not shared with dev/test)
- No cross-environment data leakage

### State Lifecycle

- Beta database is completely separate - no risk of corrupting dev data
- Redis uses separate port (6380) matching test environment pattern - no key conflicts
- Each environment (dev, test, beta) uses distinct ports for isolation

### API Surface Parity

- Web portal not required for initial beta (Discord-only flow)
- If web needed, would require separate `NEXTAUTH_URL`

## Acceptance Criteria

### Environment Setup

- [ ] Beta database `fightrise_beta` created and accessible
- [ ] Beta Discord application created with bot token
- [x] `.env.beta` file created with all required variables
- [ ] Prisma schema pushed to beta database
- [ ] Beta commands deployed to beta Discord bot
- [ ] Beta bot can start and connect to Discord

### Documentation

- [x] Tournament Organizer quickstart guide created
- [x] Player quickstart guide created
- [x] Quickstart guides linked from main docs index

### Verification

- [ ] `/tournament setup` command works
- [ ] `/link-startgg` OAuth flow initiates
- [ ] `/register` command works
- [ ] Match thread creation works
- [ ] Check-in flow works
- [ ] Score reporting works

## Success Metrics

| Metric | Target |
|--------|--------|
| Bot startup | Starts without errors |
| Commands deployed | All 9 commands visible |
| Test tournament | Can be created and configured |
| End-to-end flow | Completes without crashes |

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Discord Developer Portal | Rate limits | Use existing account |
| Start.gg API | Need test tournament | Create one for testing |
| Redis key collision | Jobs may conflict | Use separate port 6380 (matches test pattern) |
| Port conflicts | 5433/6380 in use | Check ports before starting, use alternative ports |
| OAuth callbacks | Need registered URLs | Use Cloudflare tunnel or manual URL config |
| DMNO config | Beta vars not in schema | Add to .dmno/config.mts or use .env.beta directly |

## Implementation Order

1. Create `.env.beta` with beta credentials
2. Create `docker/docker-compose.beta.yml` (optional)
3. Test database connection
4. Run Prisma schema push
5. Deploy beta commands
6. Start beta bot
7. Verify Discord connection
8. Create documentation

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-16-beta-testing-readiness-brainstorm.md](docs/brainstorms/2026-03-16-beta-testing-readiness-brainstorm.md)
- **Key decisions carried forward:**
  - Same Postgres, new Discord bot approach
  - Wiki-style Markdown documentation
  - Discord logs only for monitoring
- Docker patterns:
  - `docker/docker-compose.dev.yml` - Development config
  - `docker/docker-compose.test.yml` - Test config (pattern reference)
- Deploy script: `apps/bot/src/deploy-commands.ts`
- Environment schema: `.dmno/config.mts`
- Best practices: Docker Compose multi-environment pattern
