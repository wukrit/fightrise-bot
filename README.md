# FightRise

A Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord.

## Features

- Sync tournament data from Start.gg automatically
- Create Discord threads for each match when players are called
- Handle player check-ins via Discord button interactions
- Allow score reporting directly in Discord with confirmation flow
- Web portal for tournament configuration and admin management

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Discord Application (Bot Token, Client ID, Client Secret)
- Start.gg API Key

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/wukrit/fightrise-bot.git
cd fightrise-bot
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_CLIENT_ID` | Discord application client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret |
| `STARTGG_API_KEY` | Start.gg API token |
| `NEXTAUTH_SECRET` | NextAuth encryption key |
| `NEXTAUTH_URL` | Web app URL (http://localhost:3000 for dev) |

### 3. Start Development Environment

**Option A: Docker (Recommended)**

Start all services with hot-reload:

```bash
docker compose -f docker/docker-compose.dev.yml up
```

This starts:
- PostgreSQL at `localhost:5432`
- Redis at `localhost:6379`
- Discord bot with hot-reload
- Web portal at `localhost:3000` with hot-reload

**Option B: Infrastructure Only + Local Dev**

Start just the database and Redis:

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

Then run the apps locally:

```bash
# Terminal 1: Run the bot
npm run dev --filter=@fightrise/bot

# Terminal 2: Run the web portal
npm run dev --filter=@fightrise/web
```

### 4. Database Setup

Generate the Prisma client and push the schema:

```bash
npm run db:generate
npm run db:push
```

### 5. Deploy Discord Commands

Register slash commands with Discord:

```bash
npm run deploy --filter=@fightrise/bot
```

## Development

### Commands

```bash
# Run all apps in dev mode
npm run dev

# Run specific app
npm run dev --filter=@fightrise/bot
npm run dev --filter=@fightrise/web

# Build all packages
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database (dev)
npm run db:migrate     # Run migrations (production)
```

### Project Structure

```
apps/
├── bot/              # Discord bot (discord.js v14, BullMQ)
└── web/              # Next.js 14 web portal

packages/
├── database/         # Prisma schema and client
├── startgg-client/   # Start.gg GraphQL API wrapper
├── shared/           # Shared types and utilities
└── ui/               # Shared React components
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL 15 database |
| redis | 6379 | Redis 7 for BullMQ queues |
| bot | - | Discord bot (no exposed port) |
| web | 3000 | Next.js web portal |

### Health Checks

All Docker services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Bot: Node.js process check
- Web: HTTP check on `/api/health`

View service health:

```bash
docker compose -f docker/docker-compose.dev.yml ps
```

## Production

Build and run production containers:

```bash
docker compose -f docker/docker-compose.yml up -d
```

Or build individual images:

```bash
# Build bot
docker build -f docker/Dockerfile.bot -t fightrise-bot .

# Build web
docker build -f docker/Dockerfile.web -t fightrise-web .
```

## Contributing

1. Create a branch: `git checkout -b issue-<number>-<description>`
2. Make changes following the existing code patterns
3. Run tests: `npm run test && npm run lint`
4. Create a pull request

## License

MIT
