# DMNO Environment Management

FightRise uses [DMNO](https://dmno.dev) for environment management and secrets handling. DMNO provides a type-safe, declarative approach to managing environment variables with built-in support for local secrets.

## Why DMNO?

Traditional `.env` files have several problems:
- No type checking or validation
- No IDE autocomplete support
- Easy to accidentally commit secrets
- No way to share schema between team members

DMNO solves these by:
- Defining environment schemas in a config file
- Generating TypeScript types for autocomplete
- Supporting encrypted local secrets that aren't committed
- Providing a consistent way to inject env vars into commands

## File Structure

```
fightrise-bot/
├── .dmno.env.local          # Local secrets (gitignored - NEVER commit)
├── .dmno.env.local.example  # Template for local secrets
├── .dmno/                   # DMNO config (can commit config.mts)
│   └── config.mts
├── .env                     # Non-sensitive defaults (safe to commit)
└── .env.example             # Template for .env values
```

## How It Works

### 1. Shared Configuration (`.dmno/config.mts`)

The DMNO config file (if committed) defines what environment variables exist and their types. Team members get autocomplete for all defined variables.

### 2. Local Secrets (`.dmno.env.local`)

Sensitive values like API keys and tokens go in `.dmno.env.local`. This file is:
- **Gitignored** - never committed to version control
- **Encrypted at rest** - DMNO can encrypt these values
- **Local only** - each developer has their own copy

Copy the example file to get started:
```bash
cp .dmno.env.local.example .dmno.env.local
```

Then fill in your actual values:
```bash
# .dmno.env.local
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYz1234567890
DISCORD_CLIENT_SECRET=your_client_secret_here
STARTGG_API_KEY=your_startgg_key_here
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

### 3. Non-Sensitive Defaults (`.env`)

Non-sensitive defaults like URLs, ports, and feature flags go in `.env`:
- Database connection strings (dev defaults)
- Redis URLs
- Public redirect URIs
- Feature flags

This file CAN be committed since it contains no secrets.

## DMNO Commands

All npm scripts automatically use DMNO to inject environment variables:

```bash
# Run development servers with env vars loaded
npm run dev

# Build with env vars
npm run build

# Start production with env vars
npm run start

# Run specific service
npm run start:bot
npm run start:web
```

Behind the scenes, `dmno run` wraps the command and injects:
1. Variables from `.env` (base defaults)
2. Variables from `.dmno.env.local` (local secrets, overriding .env)
3. Variables from process.env (CI/CD secrets)

## Generating Secrets

### NEXTAUTH_SECRET

Generate a secure secret for NextAuth:

```bash
openssl rand -base64 32
```

### Discord Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to Bot tab
4. Click "Reset Token" to get your bot token
5. Copy to `.dmno.env.local`

### Start.gg API Key

1. Go to [Start.gg Developer](https://start.gg/admin/profile/developer)
2. Go to Developer Settings
3. Create new token
4. Copy immediately (can only view once)

## Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment templates:
   ```bash
   cp .env.example .env
   cp .dmno.env.local.example .dmno.env.local
   ```

3. Fill in `.dmno.env.local` with your actual secrets

4. Start infrastructure (Docker):
   ```bash
   npm run docker:infra
   ```

5. Run the application:
   ```bash
   npm run dev
   ```

## CI/CD

In CI/CD pipelines, set secrets as environment variables directly. DMNO will pick them up automatically:

```yaml
# Example GitHub Actions
env:
  DISCORD_TOKEN: ${{ secrets.DISCORD_TOKEN }}
  STARTGG_API_KEY: ${{ secrets.STARTGG_API_KEY }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
```

## Troubleshooting

### "Command failed with error: missing variable"

Make sure you've copied `.dmno.env.local.example` to `.dmno.env.local` and filled in all required values.

### TypeScript not recognizing env vars

If your IDE doesn't recognize DMNO variables, make sure the DMNO config is properly set up and run:
```bash
npx dmno up
```

### Secrets not loading

Check that `.dmno.env.local` is in the project root and has the correct format (no quotes around values).

## Security Best Practices

1. **Never commit `.dmno.env.local`** - It's in `.gitignore` for a reason
2. **Use `.dmno.env.local.example`** to document required variables without exposing values
3. **Rotate secrets periodically** - Especially in production
4. **Use different secrets for production** - Never use dev secrets in production
5. **Audit access** - Regularly review who has access to production secrets
