---
layout: default
title: "Cloudflare Tunnel Setup Guide"
---

# Cloudflare Tunnel Setup Guide

This guide walks you through setting up Cloudflare Tunnel for local OAuth development.

## Prerequisites

Before you begin, make sure you have:

- **Cloudflare account** at [cloudflare.com](https://cloudflare.com)
- **Domain** added to Cloudflare with nameservers pointed to Cloudflare
- **Homebrew** installed (macOS)

**Estimated time:** 10-15 minutes

## Related Documentation

| Document | Description |
|----------|-------------|
| [Discord Setup](./Discord-Setup) | Discord bot configuration |
| [Start.gg Setup](./StartGG-Setup) | Start.gg API setup |
| **Tunnel Setup** (this doc) | Cloudflare Tunnel for OAuth |

---

## Why Use a Tunnel?

OAuth providers (Discord, Start.gg) require publicly accessible callback URLs. During local development, your `localhost:3000` isn't accessible from the internet.

**Options:**
| Approach | Pros | Cons |
|----------|------|------|
| Cloudflare Tunnel | Free, stable URL, secure | Requires Cloudflare account + domain |
| ngrok | Easy setup | Free tier has random URLs that change |
| localtunnel | Free, open source | Less stable |

Cloudflare Tunnel provides **free, stable URLs** that you only need to configure once in your OAuth providers.

---

## Setup Steps

### 1. Install cloudflared

```bash
brew install cloudflared
```

Verify installation:
```bash
cloudflared --version
```

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select your Cloudflare domain
3. Generate credentials at `~/.cloudflared/cert.pem`

### 3. Create a Tunnel

```bash
cloudflared tunnel create fightrise-dev
```

Output:
```
Tunnel credentials written to /Users/you/.cloudflared/<UUID>.json
Created tunnel fightrise-dev with id <UUID>
```

**Save the UUID** - you'll need it for the config file.

### 4. Create Configuration File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /Users/<your-username>/.cloudflared/<TUNNEL-UUID>.json

ingress:
  # Route to Next.js web app
  - hostname: fightrise-dev.yourdomain.com
    service: http://localhost:3000
  # Catch-all (required)
  - service: http_status:404
```

Replace:
- `<TUNNEL-UUID>` with your tunnel's UUID
- `<your-username>` with your macOS username
- `yourdomain.com` with your Cloudflare domain

### 5. Create DNS Route

```bash
cloudflared tunnel route dns fightrise-dev fightrise-dev.yourdomain.com
```

This creates a CNAME record in your Cloudflare DNS.

### 6. Verify Setup

```bash
cloudflared tunnel list
```

You should see your `fightrise-dev` tunnel listed.

---

## Running the Tunnel

### Using npm script

```bash
npm run tunnel
```

### Using cloudflared directly

```bash
cloudflared tunnel run fightrise-dev
```

### Using the shell script

```bash
./scripts/tunnel.sh
```

Your local app will be accessible at `https://fightrise-dev.yourdomain.com`

---

## Update OAuth Providers

Add your tunnel URL to OAuth redirect URIs:

### Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. Add redirect URI:
   ```
   https://fightrise-dev.yourdomain.com/api/auth/callback/discord
   ```

### Start.gg Developer Settings

1. Go to [Start.gg Developer Settings](https://start.gg/admin/profile/developer)
2. Select your OAuth application
3. Add redirect URI:
   ```
   https://fightrise-dev.yourdomain.com/api/auth/callback/startgg
   ```

---

## Environment Variables

Update your `.env` for tunnel development:

```bash
# Use tunnel URL for OAuth callbacks
NEXTAUTH_URL="https://fightrise-dev.yourdomain.com"
DISCORD_REDIRECT_URI="https://fightrise-dev.yourdomain.com/api/auth/callback/discord"
STARTGG_REDIRECT_URI="https://fightrise-dev.yourdomain.com/api/auth/callback/startgg"
```

---

## Development Workflow

### Option A: Full Docker Stack with Tunnel (Recommended)

Run everything in Docker with a single command:

```bash
npm run docker:dev:tunnel
```

This starts PostgreSQL, Redis, bot, web, and the Cloudflare Tunnel together.

**Prerequisites for Docker tunnel:**
1. Complete the tunnel setup above (steps 1-5)
2. Create Docker-specific config:
   ```bash
   cp docker/cloudflared-config.yml.example docker/cloudflared-config.yml
   ```
3. Edit `docker/cloudflared-config.yml` with your tunnel UUID and domain
4. Important: Change `service: http://localhost:3000` to `service: http://web:3000` (Docker networking)

### Option B: Local Tunnel + Docker Infrastructure

If you prefer running the tunnel locally:

**Terminal 1:** Start the tunnel
```bash
npm run tunnel
```

**Terminal 2:** Start infrastructure and apps
```bash
npm run docker:dev
```

### Option C: Local Tunnel + Local Apps

For maximum control:

**Terminal 1:** Start the tunnel
```bash
npm run tunnel
```

**Terminal 2:** Start infrastructure
```bash
npm run docker:infra
```

**Terminal 3:** Start the web app
```bash
npm run dev -- --filter=@fightrise/web
```

---

Now visit `https://fightrise-dev.yourdomain.com` and OAuth flows will work.

---

## Troubleshooting

### "Tunnel not found"

```bash
# List available tunnels
cloudflared tunnel list

# Verify config file exists
cat ~/.cloudflared/config.yml
```

### "Connection refused"

Make sure your local web app is running on the port specified in `config.yml` (default: 3000).

### "DNS record not found"

```bash
# Re-create the DNS route
cloudflared tunnel route dns fightrise-dev fightrise-dev.yourdomain.com
```

### Config file conflicts

If you have issues, check for conflicting config:
```bash
ls -la ~/.cloudflared/
```

Remove any old `config.yaml` files (note: `.yaml` vs `.yml`).

---

## Managing the Tunnel

### List tunnels
```bash
cloudflared tunnel list
```

### Delete a tunnel
```bash
cloudflared tunnel delete fightrise-dev
```

### View tunnel info
```bash
cloudflared tunnel info fightrise-dev
```

---

## Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)
