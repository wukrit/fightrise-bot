---
title: Getting Started
---

# Getting Started

This guide will help you set up FightRise for local development.

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- Discord Application (Bot Token, Client ID, Client Secret)
- Start.gg API Key

## Step 1: Clone and Install

```bash
git clone https://github.com/wukrit/fightrise-bot.git
cd fightrise-bot
npm install
```

## Step 2: Environment Setup

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

### Required Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Docker provides `postgresql://fightrise:fightrise@localhost:5432/fightrise` |
| `REDIS_URL` | Redis connection string | Docker provides `redis://localhost:6379` |
| `DISCORD_TOKEN` | Discord bot token | [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_ID` | Discord application client ID | Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | Discord Developer Portal |
| `STARTGG_API_KEY` | Start.gg API token | [Start.gg Developer Settings](https://start.gg/admin/profile/developer) |
| `NEXTAUTH_SECRET` | NextAuth encryption key | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Web app URL | `http://localhost:3000` for development |

See the [Discord Setup](/fightrise-bot/wiki/Discord-Setup) and [Start.gg Setup](/fightrise-bot/wiki/Start.gg-Setup) guides for detailed instructions on obtaining credentials.

## Step 3: Start Development Environment

### Option A: Full Docker Stack (Recommended)

Start all services with hot-reload:

```bash
npm run docker:dev
```

This starts:
- PostgreSQL at `localhost:5432`
- Redis at `localhost:6379`
- Discord bot with hot-reload
- Web portal at `localhost:3000` with hot-reload

### Option B: Docker with Cloudflare Tunnel (for OAuth)

For OAuth flows that require public URLs:

```bash
npm run docker:dev:tunnel
```

This adds a Cloudflare Tunnel. See [Tunnel Setup](/fightrise-bot/wiki/Tunnel-Setup) for initial configuration.

### Option C: Infrastructure Only + Local Dev

```bash
# Start infrastructure
npm run docker:infra

# Terminal 1: Run the bot
npm run dev -- --filter=@fightrise/bot

# Terminal 2: Run the web portal
npm run dev -- --filter=@fightrise/web
```

## Step 4: Database Setup

```bash
# If using Docker
npm run docker:db:generate
npm run docker:db:push
```

## Step 5: Deploy Discord Commands

Register slash commands with Discord:

```bash
npm run docker:deploy
```

## Stopping Services

```bash
npm run docker:down
```

## Next Steps

- Configure your [Discord Application](/fightrise-bot/wiki/Discord-Setup)
- Configure your [Start.gg API Access](/fightrise-bot/wiki/Start.gg-Setup)
- Set up [Cloudflare Tunnel](/fightrise-bot/wiki/Tunnel-Setup) for OAuth development
- Review the [Commands](/fightrise-bot/wiki/Commands) available
- Explore the [Architecture](/fightrise-bot/wiki/Architecture) documentation
