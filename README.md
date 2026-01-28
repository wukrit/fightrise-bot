# FightRise

A Discord bot and web portal for running Start.gg fighting game tournaments entirely within Discord.

## Features

- Sync tournament data from Start.gg automatically
- Create Discord threads for each match when players are called
- Handle player check-ins via Discord button interactions
- Allow score reporting directly in Discord with confirmation flow
- Web portal for tournament configuration and admin management

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- Discord Application (Bot Token, Client ID, Client Secret)
- Start.gg API Key

For detailed setup instructions:
- [Discord Bot Setup Guide](./docs/DISCORD_SETUP.md) - Creating your Discord application, bot token, permissions, and OAuth2
- [Start.gg API Setup Guide](./docs/STARTGG_SETUP.md) - Getting your API key, rate limits, and OAuth2 configuration

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

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Docker provides `postgresql://fightrise:fightrise@localhost:5432/fightrise` |
| `REDIS_URL` | Redis connection string | Docker provides `redis://localhost:6379` |
| `DISCORD_TOKEN` | Discord bot token | [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Token |
| `DISCORD_CLIENT_ID` | Discord application client ID | Discord Developer Portal → General Information → Application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth client secret | Discord Developer Portal → OAuth2 → Client Secret |
| `STARTGG_API_KEY` | Start.gg API token | [Start.gg Developer Settings](https://start.gg/admin/profile/developer) |
| `NEXTAUTH_SECRET` | NextAuth encryption key | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Web app URL | `http://localhost:3000` for development |

See the [Discord Setup Guide](./docs/DISCORD_SETUP.md) and [Start.gg Setup Guide](./docs/STARTGG_SETUP.md) for detailed instructions on obtaining these credentials.

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

**Option C: With Cloudflare Tunnel (for OAuth testing)**

OAuth providers require publicly accessible redirect URLs. Use Cloudflare Tunnel to expose your local dev server:

```bash
# Terminal 1: Start the tunnel (exposes localhost:3000)
npm run tunnel

# Terminal 2: Start infrastructure
docker compose -f docker/docker-compose.yml up -d postgres redis

# Terminal 3: Run the web portal
npm run dev --filter=@fightrise/web
```

Your app will be accessible at `https://fightrise-dev.sukritwalia.com`

See [Cloudflare Tunnel Setup](#cloudflare-tunnel-for-oauth) for initial configuration.

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
npm run test               # Unit tests
npm run test:integration   # Integration tests (requires Docker)
npm run test:e2e           # Playwright browser tests

# Run linting
npm run lint

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database (dev)
npm run db:migrate     # Run migrations (production)
```

### Testing

The project uses a multi-layered testing strategy:

| Layer | Command | Description |
|-------|---------|-------------|
| Unit | `npm run test` | Fast tests for pure functions and utilities |
| Integration | `npm run test:integration` | Tests with real database (Testcontainers) |
| E2E | `npm run test:e2e` | Playwright browser tests for web portal |
| Smoke | `npm run test:smoke` | Tests against real APIs (manual/CI only) |

**Test Infrastructure:**
- **Discord Bot**: Custom test harness with mock client, interactions, and channels
- **Start.gg API**: MSW (Mock Service Worker) for GraphQL mocking
- **Database**: Testcontainers for isolated PostgreSQL instances
- **Web E2E**: Playwright with session mocking utilities

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

## Cloudflare Tunnel for OAuth

OAuth providers (Discord, Start.gg) require publicly accessible redirect URLs. Cloudflare Tunnel exposes your local development server securely.

### First-Time Setup

1. **Install cloudflared**
   ```bash
   brew install cloudflared
   ```

2. **Authenticate with Cloudflare**
   ```bash
   cloudflared tunnel login
   # Opens browser to authenticate
   ```

3. **Create the tunnel** (already done for this project)
   ```bash
   cloudflared tunnel create fightrise-dev
   ```

4. **Configure** (`~/.cloudflared/config.yml`)
   ```yaml
   tunnel: <TUNNEL-UUID>
   credentials-file: /Users/<you>/.cloudflared/<TUNNEL-UUID>.json

   ingress:
     - hostname: fightrise-dev.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. **Create DNS route**
   ```bash
   cloudflared tunnel route dns fightrise-dev fightrise-dev.yourdomain.com
   ```

### Running the Tunnel

```bash
npm run tunnel
```

Your local app will be accessible at your configured hostname (e.g., `https://fightrise-dev.sukritwalia.com`).

### OAuth Redirect URIs

Add these to your OAuth providers:

| Provider | Redirect URI |
|----------|--------------|
| Discord | `https://fightrise-dev.yourdomain.com/api/auth/callback/discord` |
| Start.gg | `https://fightrise-dev.yourdomain.com/api/auth/callback/startgg` |

---

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
3. Run tests: `npm run test && npm run test:integration && npm run lint`
4. Create a pull request

See [CLAUDE.md](./CLAUDE.md) for detailed development workflow and testing guidelines.

## Documentation

| Document | Description |
|----------|-------------|
| [Discord Setup Guide](./docs/DISCORD_SETUP.md) | Creating Discord application, bot token, permissions, OAuth2 |
| [Start.gg Setup Guide](./docs/STARTGG_SETUP.md) | API key, rate limits, OAuth2 configuration |
| [Tunnel Setup Guide](./docs/TUNNEL_SETUP.md) | Cloudflare Tunnel for local OAuth development |
| [Implementation Status](./docs/IMPLEMENTATION_STATUS.md) | Current progress, what's built, what's remaining |
| [Architecture Plan](./ARCHITECTURE_PLAN.md) | Full system design, data flow, database schema |
| [Development Guide](./CLAUDE.md) | Workflow, testing, contribution guidelines |

## License

MIT
