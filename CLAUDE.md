# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Overview

FightRise is a Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord. It syncs tournament data from Start.gg's GraphQL API, creates match threads in Discord, handles player check-ins, and allows score reporting through Discord interactions.

## Commands

```bash
# Development
npm run dev                    # Run all apps/packages in dev mode (turbo)
npm run dev --filter=@fightrise/bot   # Run just the bot
npm run dev --filter=@fightrise/web   # Run just the web app

# Build & Start
npm run build                  # Build all packages
npm run start:bot              # Start Discord bot (production)
npm run start:web              # Start web portal (production)

# Database (run from packages/database or root)
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to database (dev)
npm run db:migrate             # Run migrations (production)

# Testing & Linting
npm run test                   # Run tests via vitest
npm run lint                   # Run ESLint

# Docker (for local Postgres & Redis)
docker compose -f docker/docker-compose.yml up -d postgres redis
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

Internal packages use `workspace:*` protocol. Run `npm install` at root to link them.

Bot dependencies: `discord.js`, `bullmq`, `ioredis`, `@fightrise/database`, `@fightrise/startgg-client`
Web dependencies: `next`, `react`, `next-auth`, `@fightrise/database`, `@fightrise/ui`
